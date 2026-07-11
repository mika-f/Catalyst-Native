import { rel } from "@/lib/dayjs";
import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystFleetReaction } from "@/models/sdk-types";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type Props = {
  fleetId: string;
};

export const FleetReactionList = ({ fleetId }: Props) => {
  const client = useAtomValue(clientAtom);
  const router = useRouter();
  const [items, setItems] = useState<CatalystFleetReaction[] | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    client.catalyst.v1.fleet.id.reactions
      .get({ path: { id: fleetId }, throwOnError: true })
      .then(({ data }) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, fleetId]);

  const navigateToUser = useCallback(
    (screenName: string) => {
      router.push(`/user/${screenName}`);
    },
    [router],
  );

  if (items === null && !isError) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-light-text-muted dark:text-dark-text-muted">
          リアクションの取得に失敗しました
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => `${item.user.id}-${item.reactedAt}`}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-16">
          <Text className="text-light-text-muted dark:text-dark-text-muted">まだリアクションがありません</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigateToUser(item.user.screenName)}
          className="flex-row items-center gap-3 px-4 py-3 active:opacity-75"
        >
          <View className="relative">
            <UniImage
              source={{
                uri: item.user.profile?.iconUrl
                  ? getCdnUrl({ src: item.user.profile.iconUrl, variant: "icon", width: 96 })
                  : getIdenticonUrl(item.user.id),
              }}
              className="w-12 h-12 rounded-full"
              contentFit="cover"
            />
            <UniImage
              source={{ uri: item.reaction.url }}
              className="w-5 h-5 absolute -bottom-1 -right-1"
              contentFit="contain"
            />
          </View>

          <View className="flex-1">
            <Text className="font-semibold text-light-text dark:text-dark-text" numberOfLines={1}>
              {item.user.displayName || item.user.screenName}
            </Text>
            <Text className="text-sm text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
              @{item.user.screenName}
            </Text>
          </View>

          <Text className="text-xs text-light-text-subtle dark:text-dark-text-subtle">{rel(item.reactedAt)}</Text>
        </Pressable>
      )}
    />
  );
};
