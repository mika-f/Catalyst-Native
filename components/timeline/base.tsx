import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { merge } from "@/lib/merge";
import type { CatalystStatus, CatalystStatusV1_1 } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleProp, View, ViewStyle } from "react-native";
import { TimelineStatus } from "./status";

const ItemSeparator = () => {
  return <View className="h-px bg-light-divider dark:bg-dark-divider" />;
};

const LoadingIndicator = () => {
  return (
    <View className="py-4">
      <ActivityIndicator />
    </View>
  );
};

type Props = {
  fetcher: (since: string | null, until: string | null) => Promise<TimelineStatusItem[]>;
  renderItem?: ListRenderItem<TimelineStatusItem>;
  ListHeaderComponent?: React.ComponentType;
  ListEmptyComponent?: React.ComponentType;
  ListEmptyComponentStyle?: StyleProp<ViewStyle>;
  onRefresh?: () => void;
  ref?: React.Ref<TimelineHandle>;
};

export type TimelineStatusItem = CatalystStatus | CatalystStatusV1_1;

export type TimelineHandle = {
  scrollToTop: () => void;
};

export const TimelineBase = ({
  fetcher,
  renderItem,
  ListHeaderComponent,
  ListEmptyComponent,
  ListEmptyComponentStyle,
  onRefresh: onRefreshCallback,
  ref,
}: Props) => {
  const [items, setItems] = useState<TimelineStatusItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlashListRef<TimelineStatusItem>>(null);
  const sets = useRef<Set<string>>(new Set());
  const hasMore = useRef(true);
  const isLoadingRef = useRef(false);

  const defaultRender = useCallback<ListRenderItem<TimelineStatusItem>>(({ item }) => {
    return <TimelineStatus status={item} />;
  }, []);

  const onRender = renderItem ?? defaultRender;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    hasMore.current = true;

    try {
      const since = items.length > 0 ? items[0].id : null;
      const [newItems] = await Promise.all([
        //
        fetcher(since, null),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      if (newItems.length > 0) {
        setItems((prevItems) => merge(prevItems, newItems, sets, (item) => item.id, "first"));
      }
    } finally {
      setIsRefreshing(false);
      onRefreshCallback?.();
    }
  }, [items, fetcher, onRefreshCallback]);

  const onLoadMore = useCallback(async () => {
    if (!hasMore.current || isLoadingRef.current) return;

    setIsLoading(true);
    isLoadingRef.current = true;

    try {
      const until = items.length > 0 ? items.slice(-1)[0].id : null;
      const newItems = await fetcher(null, until);

      if (newItems.length > 0) {
        const actuallyNew = newItems.filter((item) => !sets.current.has(item.id));
        if (actuallyNew.length > 0) {
          setItems((prevItems) => merge(prevItems, newItems, sets, (item) => item.id));
        } else {
          hasMore.current = false;
        }
      } else {
        hasMore.current = false;
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [items, fetcher]);

  useAsyncOneTimeEffect(async () => {
    setIsLoading(true);

    try {
      if (items.length === 0) {
        const items = await fetcher(null, null);

        if (items) {
          setItems((prev) => merge(prev, items, sets, (item) => item.id));
        }
      }
    } finally {
      setIsLoading(false);
    }
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  return (
    <FlashList
      ref={listRef}
      keyExtractor={(w) => w.id}
      data={items}
      renderItem={onRender}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.75}
      ItemSeparatorComponent={ItemSeparator}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={isLoading ? <LoadingIndicator /> : null}
      ListEmptyComponent={!isLoading ? ListEmptyComponent : undefined}
      ListEmptyComponentStyle={!isLoading ? ListEmptyComponentStyle : undefined}
    />
  );
};
