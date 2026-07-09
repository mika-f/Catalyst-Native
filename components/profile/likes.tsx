import { CatalystDivider, CatalystEmptyState, CatalystText } from "@/components/design-system";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatusV1_1 } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { HeartOff, Lock } from "lucide-react-native";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { withUniwind } from "uniwind";
import { TimelineStatus } from "../timeline/status";
import { UserTimelineHandle } from "./timeline";

const UniHeartOff = withUniwind(HeartOff);
const UniLock = withUniwind(Lock);

const ItemSeparator = () => {
  return <CatalystDivider />;
};

const PrivacyNotice = () => {
  return (
    <View className="flex-row items-center justify-center gap-2 border-b border-light-divider bg-light-background px-5 py-3 dark:border-dark-divider dark:bg-dark-surface">
      <UniLock size={14} className="text-light-text-muted dark:text-dark-text-muted" />
      <CatalystText tone="muted" className="text-center">
        いいねは非公開です。自分にのみ表示されます。
      </CatalystText>
    </View>
  );
};

const EmptyState = () => {
  return (
    <CatalystEmptyState
      title="いいねした投稿がありません"
      icon={<UniHeartOff />}
      className="min-h-96"
    />
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
        const { data } = await client.catalyst.v1.timeline.favorite.get({ query: {}, throwOnError: true });
        setItems((prev) => merge(prev, data.statuses, sets, (item) => item.id));
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
        const { data } = await client.catalyst.v1.timeline.favorite.get({
          query: { until: lastItem.id },
          throwOnError: true,
        });

        if (data.statuses.length > 0) {
          setItems((prev) => merge(prev, data.statuses, sets, (item) => item.id));
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
            <ActivityIndicator colorClassName="accent-light-tint dark:accent-dark-tint" />
          </View>
        )}
      </View>
    );
  }),
);
UserLikes.displayName = "UserLikes";
