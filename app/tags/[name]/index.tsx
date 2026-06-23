import { getCdnUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import type { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Hash, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniHash = withUniwind(Hash);
const UniUsers = withUniwind(Users);

type TagMeta = {
  name: string;
  usageCount: number;
};

type TagUserResponse = {
  tag: TagMeta;
  users: (EgeriaUser & { matchedTags: string[] })[];
  nextCursor: string | null;
};

const UserRow = ({ user }: { user: EgeriaUser & { matchedTags: string[] } }) => {
  const router = useRouter();

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 border-b border-light-divider dark:border-dark-divider"
      onPress={() => router.push(`/user/${user.screenName}`)}
    >
      {user.profile ? (
        <UniImage
          source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) }}
          className="w-12 h-12 rounded-full"
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-light-skeleton dark:bg-dark-skeleton" />
      )}

      <View className="flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-light-text dark:text-dark-text" numberOfLines={1}>
          {user.displayName}
        </Text>
        <Text className="text-xs text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
          @{user.screenName}
        </Text>
        {user.profile?.bio ? (
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5" numberOfLines={2}>
            {user.profile.bio}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const UserRowSkeleton = () => (
  <View className="flex-row items-center gap-3 px-4 py-3 border-b border-light-divider dark:border-dark-divider">
    <View className="w-12 h-12 rounded-full bg-light-skeleton dark:bg-dark-skeleton" />
    <View className="flex-1 gap-1.5">
      <View className="h-3.5 w-28 rounded bg-light-skeleton dark:bg-dark-skeleton" />
      <View className="h-3 w-20 rounded bg-light-skeleton dark:bg-dark-skeleton" />
      <View className="h-3 w-full rounded bg-light-skeleton dark:bg-dark-skeleton" />
    </View>
  </View>
);

export default function ProfileTagPage() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const tagName = decodeURIComponent(name ?? "");
  const client = useAtomValue(clientAtom);

  const [meta, setMeta] = useState<TagMeta | null>(null);
  const [users, setUsers] = useState<(EgeriaUser & { matchedTags: string[] })[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  const fetchPage = useCallback(
    async (nextCursor: string | null) => {
      try {
        const raw = await client.catalyst.getUsersByProfileTag(
          encodeURIComponent(tagName),
          nextCursor ?? undefined,
        );
        const data = raw as unknown as TagUserResponse;

        setMeta(data.tag);
        setUsers((prev) => (nextCursor ? [...prev, ...data.users] : data.users));
        setCursor(data.nextCursor);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      }
    },
    [client, tagName],
  );

  useEffect(() => {
    setLoading(true);
    setMeta(null);
    setUsers([]);
    setCursor(null);
    setNotFound(false);
    setError(false);
    fetchPage(null).finally(() => setLoading(false));
  }, [fetchPage]);

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    await fetchPage(cursor);
    setLoadingMore(false);
  }, [cursor, loadingMore, fetchPage]);

  const renderEmpty = () => {
    if (loading) return null;

    if (notFound) {
      return (
        <View className="flex-1 items-center justify-center py-20 gap-3 px-4">
          <View className="w-14 h-14 rounded-full bg-light-surface-muted dark:bg-dark-surface-muted items-center justify-center">
            <UniHash size={28} className="text-light-text-muted dark:text-dark-text-muted" />
          </View>
          <Text className="font-semibold text-base text-light-text dark:text-dark-text">#{tagName}</Text>
          <Text className="text-sm text-light-text-muted dark:text-dark-text-muted text-center max-w-xs">
            このタグはまだ誰も設定していません。
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 items-center justify-center py-20 px-4">
          <Text className="text-sm text-light-text-muted dark:text-dark-text-muted text-center">
            データの取得中にエラーが発生しました。しばらくしてから再度お試しください。
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-16 gap-2 px-4">
        <UniUsers size={40} className="text-light-text-subtle dark:text-dark-text-subtle opacity-40" />
        <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
          このタグを設定しているユーザーはいません
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {meta && (
        <View className="px-4 py-5 border-b border-light-divider dark:border-dark-divider gap-2">
          <View className="flex-row items-center gap-2">
            <View className="rounded-full bg-light-surface-muted dark:bg-dark-surface-muted px-3 py-1.5">
              <Text className="text-xl font-bold text-light-text dark:text-dark-text">#{meta.name}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1.5">
            <UniUsers size={14} className="text-light-text-muted dark:text-dark-text-muted" />
            <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
              <Text className="font-semibold text-light-text dark:text-dark-text">
                {meta.usageCount.toLocaleString()}
              </Text>{" "}
              人がタグを設定中
            </Text>
          </View>
        </View>
      )}
      {loading && (
        <View>
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <UserRowSkeleton key={i} />
          ))}
        </View>
      )}
    </>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: `#${tagName}` }} />
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserRow user={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
        />
      </View>
    </>
  );
}
