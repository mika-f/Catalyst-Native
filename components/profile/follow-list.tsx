import { UserCard } from "@/components/explorer/users/card";
import { UserListPlaceholder } from "@/components/explorer/users/skeleton";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystFollowListItem } from "@/models/sdk-types";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  screenName: string;
  type: "followings" | "followers";
};

export const FollowList = ({ screenName, type }: Props) => {
  const client = useAtomValue(clientAtom);
  const [users, setUsers] = useState<CatalystFollowListItem[]>([]);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const isLoadingRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!client || isLoadingRef.current) return;

      isLoadingRef.current = true;
      if (page === 1) {
        setIsInitialLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const { data: res } =
          type === "followings"
            ? await client.catalyst.v1.relationships.by.username.username.followings.get({
                path: { username: screenName },
                query: { page },
                throwOnError: true,
              })
            : await client.catalyst.v1.relationships.by.username.username.followers.get({
                path: { username: screenName },
                query: { page },
                throwOnError: true,
              });

        setUsers((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setNextPage(res.page.next);
      } finally {
        isLoadingRef.current = false;
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [client, screenName, type],
  );

  useAsyncEffect(async () => {
    setUsers([]);
    setNextPage(null);
    await fetchPage(1);
  }, [screenName, type]);

  const onEndReached = useCallback(() => {
    if (nextPage !== null && !isInitialLoading) {
      fetchPage(nextPage);
    }
  }, [fetchPage, nextPage, isInitialLoading]);

  const renderItem = useCallback<ListRenderItem<CatalystFollowListItem>>(({ item }) => {
    return <UserCard user={{ ...item, profileEmoji: item.profileEmoji ?? null }} />;
  }, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (isInitialLoading) {
      return <UserListPlaceholder />;
    }
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-light-text-muted dark:text-dark-text-muted">
          {type === "followings" ? "フォロー中のユーザーがいません" : "フォロワーがいません"}
        </Text>
      </View>
    );
  }, [isInitialLoading, type]);

  return (
    <FlashList
      data={users}
      keyExtractor={(w) => w.id}
      renderItem={renderItem}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
    />
  );
};
