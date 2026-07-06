import { getReactionKey } from "@/lib/reactions";
import { accountAtom } from "@/models/atoms/account";
import { streamingEnabledAtom } from "@/models/atoms/streaming";
import type { CatalystReaction } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type EventBase<T extends string, P> = {
  id: string;
  type: T;
  params: P;
};

type ReactionVerbArgs = {
  reaction: {
    status: string;
    symbol: string;
    by: string;
    type: "standard" | "custom";
    format?: string;
    customReactionId?: string;
  };
};

export type ReactionIncrementEvent = EventBase<"reaction:increment", ReactionVerbArgs>;
export type ReactionDecrementEvent = EventBase<"reaction:decrement", ReactionVerbArgs>;
export type ReactionStreamingEvent = ReactionIncrementEvent | ReactionDecrementEvent;

type SubscriptionMessage = {
  type: "subscribe" | "unsubscribe";
  channel: "status";
  id: string;
};

type ServerMessage =
  | { type: "subscribed"; channel: "status"; id: string }
  | { type: "unsubscribed"; channel: "status"; id: string }
  | { type: "error"; message: string }
  | ReactionStreamingEvent;

type ReactionUpdateCallback = (event: ReactionStreamingEvent) => void;

type StreamingContextValue = {
  enabled: boolean;
  isConnected: boolean;
  userId: string | null;
  subscribe: (statusId: string, callback: ReactionUpdateCallback) => void;
  unsubscribe: (statusId: string, callback: ReactionUpdateCallback) => void;
};

const STREAMING_URL = "wss://streaming.natsuneko.com/ws";
const RECONNECT_DELAY_MS = 3000;
const IDLE_CLOSE_DELAY_MS = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;
const LOCAL_REACTION_TTL_MS = 15000;
const PROCESSED_EVENT_TTL_MS = 10 * 60 * 1000;

const StreamingContext = createContext<StreamingContextValue | null>(null);
const localReactionMutationCounts = new Map<string, number>();
const localReactionMutationTimers = new Map<string, ReturnType<typeof setTimeout>>();
const processedEventTimers = new Map<string, ReturnType<typeof setTimeout>>();
const appliedEventTimers = new Map<string, ReturnType<typeof setTimeout>>();

function logStreaming(message: string, context?: Record<string, unknown>): void {
  if (!__DEV__) return;

  if (context) {
    console.log(`[Streaming] ${message}`, context);
  } else {
    console.log(`[Streaming] ${message}`);
  }
}

function warnStreaming(message: string, context?: unknown): void {
  if (!__DEV__) return;

  if (context) {
    console.warn(`[Streaming] ${message}`, context);
  } else {
    console.warn(`[Streaming] ${message}`);
  }
}

function getReactionUrl(reaction: ReactionVerbArgs["reaction"]): string {
  if (reaction.type === "custom") {
    const shortcode = reaction.symbol.slice(1, -1);
    return `https://images.natsuneko.com/${reaction.by}/reactions/${shortcode}.${reaction.format ?? "png"}`;
  }

  return `https://static.natsuneko.com/images/reactions/${reaction.symbol}.png`;
}

function markProcessedEvent(eventId: string): boolean {
  if (processedEventTimers.has(eventId)) {
    logStreaming("skip duplicate event", { eventId });
    return false;
  }

  const timer = setTimeout(() => {
    processedEventTimers.delete(eventId);
    logStreaming("expire processed event", { eventId });
  }, PROCESSED_EVENT_TTL_MS);

  processedEventTimers.set(eventId, timer);
  logStreaming("mark processed event", {
    eventId,
    processedEvents: processedEventTimers.size,
  });

  return true;
}

function markAppliedEvent(scope: string, eventId: string): boolean {
  const key = `${scope}:${eventId}`;
  if (appliedEventTimers.has(key)) {
    logStreaming("skip duplicate state event", { scope, eventId });
    return false;
  }

  const timer = setTimeout(() => {
    appliedEventTimers.delete(key);
    logStreaming("expire applied event", { scope, eventId });
  }, PROCESSED_EVENT_TTL_MS);

  appliedEventTimers.set(key, timer);
  return true;
}

function getLocalReactionMutationKey(
  statusId: string,
  type: ReactionStreamingEvent["type"],
  symbol: string,
  customReactionId?: string,
): string {
  return `${type}:${statusId}:${getReactionKey(symbol, customReactionId)}`;
}

function decrementLocalReactionMutation(key: string): void {
  const count = localReactionMutationCounts.get(key) ?? 0;
  if (count <= 1) {
    localReactionMutationCounts.delete(key);

    const timer = localReactionMutationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      localReactionMutationTimers.delete(key);
    }
    return;
  }

  localReactionMutationCounts.set(key, count - 1);
}

function consumeLocalReactionMutation(event: ReactionStreamingEvent): boolean {
  const { reaction } = event.params;
  const key = getLocalReactionMutationKey(reaction.status, event.type, reaction.symbol, reaction.customReactionId);
  const count = localReactionMutationCounts.get(key) ?? 0;
  if (count === 0) return false;

  decrementLocalReactionMutation(key);
  logStreaming("skip local reaction event", {
    eventId: event.id,
    key,
    remaining: Math.max(0, count - 1),
  });

  return true;
}

export function registerLocalReactionMutation(
  statusId: string,
  type: ReactionStreamingEvent["type"],
  symbol: string,
  customReactionId?: string,
): () => void {
  const key = getLocalReactionMutationKey(statusId, type, symbol, customReactionId);
  const count = localReactionMutationCounts.get(key) ?? 0;
  localReactionMutationCounts.set(key, count + 1);

  const previousTimer = localReactionMutationTimers.get(key);
  if (previousTimer) {
    clearTimeout(previousTimer);
  }

  localReactionMutationTimers.set(
    key,
    setTimeout(() => {
      localReactionMutationCounts.delete(key);
      localReactionMutationTimers.delete(key);
      logStreaming("expire local reaction mutation", { key });
    }, LOCAL_REACTION_TTL_MS),
  );

  logStreaming("register local reaction mutation", {
    key,
    count: count + 1,
  });

  return () => {
    decrementLocalReactionMutation(key);
    logStreaming("rollback local reaction mutation", { key });
  };
}

export function applyReactionStreamingEvent(
  current: Record<string, CatalystReaction>,
  event: ReactionStreamingEvent,
  scope?: string,
): Record<string, CatalystReaction> {
  const { reaction } = event.params;
  const key = getReactionKey(reaction.symbol, reaction.customReactionId);
  const existing = current[key];

  if (scope && !markAppliedEvent(scope, event.id)) {
    return current;
  }

  if (event.type === "reaction:increment") {
    logStreaming("apply reaction increment", {
      eventId: event.id,
      key,
      statusId: reaction.status,
      symbol: reaction.symbol,
      previousCount: existing?.count ?? 0,
      nextCount: (existing?.count ?? 0) + 1,
      customReactionId: reaction.customReactionId,
    });

    return {
      ...current,
      [key]: {
        ...existing,
        symbol: reaction.symbol,
        count: (existing?.count ?? 0) + 1,
        url: existing?.url ?? getReactionUrl(reaction),
        name: existing?.name ?? reaction.symbol,
        hasSelfReaction: existing?.hasSelfReaction ?? false,
        customReactionId: reaction.customReactionId ?? existing?.customReactionId,
      },
    };
  }

  if (!existing) {
    logStreaming("skip reaction decrement: reaction is not in state", {
      eventId: event.id,
      key,
      statusId: reaction.status,
      symbol: reaction.symbol,
      customReactionId: reaction.customReactionId,
    });

    return current;
  }

  logStreaming("apply reaction decrement", {
    eventId: event.id,
    key,
    statusId: reaction.status,
    symbol: reaction.symbol,
    previousCount: existing.count ?? 0,
    nextCount: Math.max(0, (existing.count ?? 0) - 1),
    customReactionId: reaction.customReactionId,
  });

  return {
    ...current,
    [key]: {
      ...existing,
      count: Math.max(0, (existing.count ?? 0) - 1),
    },
  };
}

export function StreamingProvider({ children }: { children: ReactNode }) {
  const account = useAtomValue(accountAtom);
  const enabled = useAtomValue(streamingEnabledAtom);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const isClosingRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  const callbacksRef = useRef<Map<string, Set<ReactionUpdateCallback>>>(new Map());

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearIdleCloseTimer = useCallback(() => {
    if (idleCloseTimerRef.current) {
      clearTimeout(idleCloseTimerRef.current);
      idleCloseTimerRef.current = null;
    }
  }, []);

  const sendSubscription = useCallback((statusId: string, type: SubscriptionMessage["type"]) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logStreaming("skip send subscription: socket is not open", {
        statusId,
        type,
        readyState: ws?.readyState ?? "none",
      });
      return;
    }

    logStreaming("send subscription", { statusId, type });
    ws.send(JSON.stringify({ type, channel: "status", id: statusId } satisfies SubscriptionMessage));
  }, []);

  const close = useCallback(() => {
    clearReconnectTimer();
    clearIdleCloseTimer();
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;

    if (wsRef.current) {
      logStreaming("close socket", {
        readyState: wsRef.current.readyState,
        subscriptions: callbacksRef.current.size,
      });
      isClosingRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, [clearIdleCloseTimer, clearReconnectTimer]);

  const closeWhenIdle = useCallback(() => {
    if (callbacksRef.current.size > 0) return;

    clearIdleCloseTimer();
    logStreaming("schedule idle close", { delayMs: IDLE_CLOSE_DELAY_MS });
    idleCloseTimerRef.current = setTimeout(() => {
      if (callbacksRef.current.size === 0) {
        logStreaming("idle close fired");
        close();
      }
    }, IDLE_CLOSE_DELAY_MS);
  }, [clearIdleCloseTimer, close]);

  const connect = useCallback(() => {
    if (!enabled) {
      logStreaming("skip connect: streaming disabled", { subscriptions: callbacksRef.current.size });
      return;
    }

    if (!account) {
      logStreaming("skip connect: account is not ready", { subscriptions: callbacksRef.current.size });
      return;
    }

    if (callbacksRef.current.size === 0) {
      logStreaming("skip connect: no subscriptions");
      return;
    }

    const readyState = wsRef.current?.readyState;
    if (isConnectingRef.current || readyState === WebSocket.CONNECTING || readyState === WebSocket.OPEN) {
      logStreaming("skip connect: socket already active", {
        isConnecting: isConnectingRef.current,
        readyState: readyState ?? "none",
        subscriptions: callbacksRef.current.size,
      });
      return;
    }

    clearIdleCloseTimer();
    isConnectingRef.current = true;

    try {
      logStreaming("connecting", {
        url: STREAMING_URL,
        subscriptions: [...callbacksRef.current.keys()],
      });
      const ws = new WebSocket(STREAMING_URL);

      ws.onopen = () => {
        logStreaming("connected", { subscriptions: [...callbacksRef.current.keys()] });
        setIsConnected(true);
        isConnectingRef.current = false;
        isClosingRef.current = false;
        reconnectAttemptsRef.current = 0;

        if (callbacksRef.current.size === 0) {
          logStreaming("connected with no subscriptions");
          closeWhenIdle();
          return;
        }

        for (const statusId of callbacksRef.current.keys()) {
          sendSubscription(statusId, "subscribe");
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as ServerMessage;

          if (message.type === "reaction:increment" || message.type === "reaction:decrement") {
            logStreaming("received reaction event", {
              eventId: message.id,
              type: message.type,
              statusId: message.params.reaction.status,
              symbol: message.params.reaction.symbol,
              callbacks: callbacksRef.current.get(message.params.reaction.status)?.size ?? 0,
            });

            if (!markProcessedEvent(message.id)) {
              return;
            }

            if (consumeLocalReactionMutation(message)) {
              return;
            }

            const callbacks = callbacksRef.current.get(message.params.reaction.status);
            if (!callbacks) return;

            for (const callback of callbacks) {
              callback(message);
            }
          } else if (message.type === "subscribed" || message.type === "unsubscribed") {
            logStreaming("received subscription ack", {
              type: message.type,
              statusId: message.id,
            });
          } else if (message.type === "error") {
            warnStreaming("server error message", message.message);
          }
        } catch (error) {
          warnStreaming("failed to parse WebSocket message", error);
        }
      };

      ws.onerror = (error) => {
        warnStreaming("WebSocket error", error);
      };

      ws.onclose = (event) => {
        logStreaming("closed", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          intentional: isClosingRef.current,
          subscriptions: callbacksRef.current.size,
        });
        setIsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;

        if (isClosingRef.current) {
          isClosingRef.current = false;
          return;
        }

        if (!enabled || !account || callbacksRef.current.size === 0) return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;

        reconnectAttemptsRef.current += 1;
        clearReconnectTimer();
        logStreaming("schedule reconnect", {
          attempt: reconnectAttemptsRef.current,
          maxAttempts: MAX_RECONNECT_ATTEMPTS,
          delayMs: RECONNECT_DELAY_MS,
        });
        reconnectTimerRef.current = setTimeout(() => {
          connectRef.current();
        }, RECONNECT_DELAY_MS);
      };

      wsRef.current = ws;
    } catch (error) {
      isConnectingRef.current = false;
      warnStreaming("failed to create WebSocket", error);
    }
  }, [account, clearIdleCloseTimer, clearReconnectTimer, closeWhenIdle, enabled, sendSubscription]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const subscribe = useCallback(
    (statusId: string, callback: ReactionUpdateCallback) => {
      const callbacks = callbacksRef.current.get(statusId) ?? new Set<ReactionUpdateCallback>();
      const needsServerSubscription = callbacks.size === 0;

      callbacks.add(callback);
      callbacksRef.current.set(statusId, callbacks);
      clearIdleCloseTimer();
      logStreaming("register subscription", {
        statusId,
        callbacks: callbacks.size,
        subscriptions: callbacksRef.current.size,
        enabled,
        hasAccount: !!account,
      });

      if (!enabled || !account) return;

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        if (needsServerSubscription) {
          sendSubscription(statusId, "subscribe");
        }
      } else {
        connect();
      }
    },
    [account, clearIdleCloseTimer, connect, enabled, sendSubscription],
  );

  const unsubscribe = useCallback(
    (statusId: string, callback: ReactionUpdateCallback) => {
      const callbacks = callbacksRef.current.get(statusId);
      if (!callbacks) {
        logStreaming("skip unregister subscription: unknown status", { statusId });
        return;
      }

      callbacks.delete(callback);
      if (callbacks.size > 0) {
        logStreaming("unregister callback", {
          statusId,
          callbacks: callbacks.size,
          subscriptions: callbacksRef.current.size,
        });
        return;
      }

      callbacksRef.current.delete(statusId);
      logStreaming("unregister subscription", {
        statusId,
        subscriptions: callbacksRef.current.size,
      });
      sendSubscription(statusId, "unsubscribe");

      if (callbacksRef.current.size === 0) {
        closeWhenIdle();
      }
    },
    [closeWhenIdle, sendSubscription],
  );

  useEffect(() => {
    logStreaming("state changed", {
      enabled,
      hasAccount: !!account,
      subscriptions: callbacksRef.current.size,
      isConnected,
      readyState: wsRef.current?.readyState ?? "none",
    });

    if (!enabled || !account) {
      const timer = setTimeout(close, 0);
      return () => {
        clearTimeout(timer);
      };
    }

    if (callbacksRef.current.size > 0) {
      connect();
    }
  }, [account, close, connect, enabled, isConnected]);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  const value = useMemo(
    () => ({
      enabled,
      isConnected,
      userId: account?.user.id ?? null,
      subscribe,
      unsubscribe,
    }),
    [account?.user.id, enabled, isConnected, subscribe, unsubscribe],
  );

  return <StreamingContext.Provider value={value}>{children}</StreamingContext.Provider>;
}

export function useStreamingReactions() {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error("useStreamingReactions must be used within StreamingProvider");
  }

  return context;
}
