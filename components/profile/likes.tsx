import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { merge } from "@/lib/merge";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatusV1_1 } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { HeartOff, Lock } from "lucide-react-native";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { TimelineStatus } from "../timeline/status";
import { UserTimelineHandle } from "./timeline";

const UniHeartOff = withUniwind(HeartOff);
const UniLock = withUniwind(Lock);

const ItemSeparator = () => {
  return <View className={cn("h-px bg-light-border dark:bg-dark-border")} />;
};

const PrivacyNotice = () => {
  return (
    <View className="flex-row items-center justify-center gap-2 px-4 py-3 bg-light-surface dark:bg-dark-surface">
      <UniLock size={14} className="text-light-text-muted dark:text-dark-text-muted" />
      <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
        いいねは非公開です。自分にのみ表示されます。
      </Text>
    </View>
  );
};

const EmptyState = () => {
  return (
    <View className="items-center justify-center py-16">
      <UniHeartOff size={48} className="text-light-text-muted dark:text-dark-text-muted" />
      <Text className="mt-4 text-base text-light-text-muted dark:text-dark-text-muted">いいねした投稿がありません</Text>
    </View>
  );
};

export const UserLikes = memo(
  React.forwardRef<UserTimelineHandle>((_props, ref) => {
    const client = useAtomValue(clientAtom);
    const [items, setItems] = useState<CatalystStatusV1_1[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const isLoadingRef = useRef(false);
    const sets = useRef(new Set<string>());

    const fetchItems = useCallback(async () => {
      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.favoriteTimeline({});
        setItems((prev) => merge(prev, result, sets, (item) => item.id));
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
        setHasFetched(true);
      }
    }, [client]);

    const loadMore = useCallback(async () => {
      if (isLoadingRef.current) return;

      const lastItem = items[items.length - 1];
      if (!lastItem) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const result = await client.catalyst.favoriteTimeline({
          until: lastItem.id,
        });

        if (result.length > 0) {
          setItems((prev) => merge(prev, result, sets, (item) => item.id));
        }
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [items, client]);

    useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

    useAsyncOneTimeEffect(fetchItems);

    return (
      <View>
        <PrivacyNotice />
        {hasFetched && items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item, index) => (
            <View key={item.id}>
              {index > 0 && <ItemSeparator />}
              <TimelineStatus status={item} />
            </View>
          ))
        )}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </View>
    );
  }),
);
UserLikes.displayName = "UserLikes";
