import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { rel } from "@/lib/dayjs";
import { clientAtom } from "@/models/atoms/credential";
import type { Notification, NotificationGroup } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Ref, memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, Text, View } from "react-native";

const MESSAGE_TITLE = "natsuneko-laboratory:kiana:message";

type NotificationGroupWithDate = NotificationGroup & { createdAt?: string };

type TimelineHandle = {
  scrollToTop: () => void;
};

type Props = {
  ref?: Ref<TimelineHandle>;
};

type ItemProps = {
  notification: Notification;
};

const UserMessageItem = memo(({ notification }: ItemProps) => {
  const router = useRouter();
  const message = notification.entities[0] as NotificationGroupWithDate;
  const sender = message?.occurredBy;
  const isUnread = !notification.read;

  return (
    <View className={`px-4 py-3 gap-2 ${isUnread ? "bg-light-info-background dark:bg-dark-info-background" : ""}`}>
      <View className="flex-row items-center gap-2">
        <View className="relative">
          <View className="px-2 py-0.5 rounded-full border border-light-info dark:border-dark-info bg-light-info-background dark:bg-dark-info-background">
            <Text className="text-xs text-light-info dark:text-dark-info">システムメッセージ</Text>
          </View>
          {isUnread && (
            <View className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-light-info dark:bg-dark-info" />
          )}
        </View>
        {sender && (
          <Pressable onPress={() => router.push(`/user/${sender.screenName}`)}>
            <Text className="text-sm text-light-tint dark:text-dark-tint">{sender.displayName}</Text>
          </Pressable>
        )}
        {message?.createdAt && (
          <Text className="ml-auto text-xs text-light-text-muted dark:text-dark-text-muted">
            {rel(message.createdAt)}
          </Text>
        )}
      </View>
      <Text className="text-sm text-light-text dark:text-dark-text">{message?.body ?? ""}</Text>
    </View>
  );
});

UserMessageItem.displayName = "UserMessageItem";

const ItemSeparator = () => <View className="h-px bg-light-divider dark:bg-dark-divider" />;

const EmptyState = () => (
  <View className="flex-1 items-center justify-center py-16 gap-4">
    <Text className="text-5xl">💌</Text>
    <Text className="text-base font-bold text-light-icon dark:text-dark-icon">メッセージがありません</Text>
  </View>
);

export const UserMessageList = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [items, setItems] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const list = useRef<FlashListRef<Notification>>(null);

  const fetchMessages = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client) return [];

      const result = await client.steambird.notifications(client.steambird.ISSUER_CATALYST_USER_MESSAGE, {
        ...(since ? { since } : {}),
        ...(until ? { until } : {}),
      });
      return result.notifications.filter((n) => n.title === MESSAGE_TITLE);
    },
    [client],
  );

  const markAllAsRead = useCallback(async () => {
    if (!client) return;
    try {
      await client.steambird.readAll(client.steambird.ISSUER_CATALYST_USER_MESSAGE);
    } catch {
      // 既読処理の失敗は無視
    }
  }, [client]);

  useAsyncOneTimeEffect(async () => {
    if (!client) return;
    setIsLoading(true);
    try {
      const messages = await fetchMessages(null, null);
      setItems(messages);
      await markAllAsRead();
    } finally {
      setIsLoading(false);
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
        fetchMessages(since, null),
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
  }, [items, fetchMessages, markAllAsRead]);

  const onLoadMore = useCallback(async () => {
    if (isLoading || items.length === 0) return;
    setIsLoading(true);
    try {
      const until = items[items.length - 1].id;
      const newItems = await fetchMessages(null, until);
      if (newItems.length > 0) {
        const existingIds = new Set(items.map((i) => i.id));
        const unique = newItems.filter((n) => !existingIds.has(n.id));
        setItems((prev) => [...prev, ...unique]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [items, isLoading, fetchMessages]);

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    return <UserMessageItem notification={item} />;
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
      ListFooterComponent={isLoading ? <ActivityIndicator className="py-4" /> : null}
      ListEmptyComponent={!isLoading ? EmptyState : undefined}
    />
  );
};
