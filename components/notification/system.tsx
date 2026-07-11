import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import type { Notification } from "@/models/sdk-types";
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import React, { Ref, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, Text, View, useColorScheme } from "react-native";
import { FleetReactionNotification } from "./fleet-reaction";
import { FollowNotification } from "./follow";
import { SystemNotificationPlaceholder } from "./placeholder";
import { ReactionNotification } from "./reaction";

const REACTION_TITLE = "natsuneko-laboratory:reaction:increment";
const FLEET_REACTION_TITLE = "natsuneko-laboratory:fleet:reaction:increment";
const FOLLOW_TITLE = "natsuneko-laboratory:follow:increment";
const ISSUER_CATALYST_SYSTEM_MESSAGE = "natsuneko-laboratory:catalyst";

const ItemSeparator = () => {
  const theme = useColorScheme();
  return <View className={cn("h-px", theme === "dark" ? "bg-gray-700" : "bg-gray-300")} />;
};

const EmptyState = () => (
  <View className="flex-1 items-center justify-center py-16 gap-4">
    <Text className="text-5xl">🔕</Text>
    <Text className="text-base font-bold text-light-icon dark:text-dark-icon">通知がありません</Text>
  </View>
);

type TimelineHandle = {
  scrollToTop: () => void;
};

type Props = {
  ref?: Ref<TimelineHandle>;
};

export const SystemNotificationList = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [items, setItems] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const list = useRef<FlashListRef<Notification>>(null);

  const fetchNotifications = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client) return [];

      const { data } = await client.steambird.v1.notifications.get({
        query: {
          issuer: ISSUER_CATALYST_SYSTEM_MESSAGE,
          ...(since ? { since } : {}),
          ...(until ? { until } : {}),
        },
        throwOnError: true,
      });
      return data.notifications.filter(
        (n) => n.title === REACTION_TITLE || n.title === FLEET_REACTION_TITLE || n.title === FOLLOW_TITLE,
      );
    },
    [client],
  );

  const markAllAsRead = useCallback(async () => {
    if (!client) return;
    try {
      await client.steambird.v1.notifications.all.create({
        query: { issuer: ISSUER_CATALYST_SYSTEM_MESSAGE },
        throwOnError: true,
      });
      if (Platform.OS === "ios") {
        PushNotificationIOS.setApplicationIconBadgeNumber(0);
      }
    } catch {
      // 既読処理の失敗は無視
    }
  }, [client]);

  useAsyncOneTimeEffect(async () => {
    if (!client) {
      setIsInitialLoading(false);
      return;
    }
    setIsInitialLoading(true);
    try {
      const notifications = await fetchNotifications(null, null);
      setItems(notifications);
      await markAllAsRead();
    } finally {
      setIsInitialLoading(false);
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        list.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const since = items.length > 0 ? items[0].id : null;
      const [newItems] = await Promise.all([
        //
        fetchNotifications(since, null),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const unique = newItems.filter((n) => !existingIds.has(n.id));
        setItems((prev) => [...unique, ...prev]);
      }
      await markAllAsRead();
    } finally {
      setIsRefreshing(false);
    }
  }, [items, fetchNotifications, markAllAsRead]);

  const onLoadMore = useCallback(async () => {
    if (isLoadingMore || isInitialLoading || items.length === 0) return;
    setIsLoadingMore(true);
    try {
      const until = items[items.length - 1].id;
      const newItems = await fetchNotifications(null, until);
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const unique = newItems.filter((n) => !existingIds.has(n.id));
        setItems((prev) => [...prev, ...unique]);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [items, isLoadingMore, isInitialLoading, fetchNotifications]);

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    if (item.title === REACTION_TITLE) {
      return <ReactionNotification notification={item} />;
    }
    if (item.title === FLEET_REACTION_TITLE) {
      return <FleetReactionNotification notification={item} />;
    }
    if (item.title === FOLLOW_TITLE) {
      return <FollowNotification notification={item} />;
    }
    return null;
  }, []);

  return (
    <FlashList
      ref={list}
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator className="py-4" /> : null}
      ListEmptyComponent={isInitialLoading ? SystemNotificationPlaceholder : EmptyState}
    />
  );
};
