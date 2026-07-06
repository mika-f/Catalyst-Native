import { UserCard } from "@/components/explorer/users/card";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  screenName: string;
  type: "followings" | "followers";
};

export const FollowList = ({ screenName, type }: Props) => {
  const client = useAtomValue(clientAtom);
  const [users, setUsers] = useState<EgeriaUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!client || isLoading) return;

      setIsLoading(true);
      try {
        const res =
          type === "followings"
            ? await client.catalyst.followings(screenName, { page })
            : await client.catalyst.followers(screenName, { page });

        setUsers((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setCurrentPage(res.page.current);
        setNextPage(res.page.next);
      } finally {
        setIsLoading(false);
      }
    },
    [client, isLoading, screenName, type],
  );

  useAsyncEffect(async () => {
    await fetchPage(1);
  }, [screenName, type]);

  const onEndReached = useCallback(() => {
    if (nextPage !== null) {
      fetchPage(nextPage);
    }
  }, [fetchPage, nextPage]);

  const renderItem = useCallback<ListRenderItem<EgeriaUser>>(({ item }) => {
    return <UserCard user={item} />;
  }, []);

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    );
  }, [isLoading]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-light-text-muted dark:text-dark-text-muted">
          {type === "followings" ? "フォロー中のユーザーがいません" : "フォロワーがいません"}
        </Text>
      </View>
    );
  }, [isLoading, type]);

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
