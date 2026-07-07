import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus, EgeriaUser } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { MessageSquare } from "lucide-react-native";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View } from "react-native";

const COLUMNS = 3;
const GAP = 1;

type Props = {
  user?: EgeriaUser | null;
};

export type UserTimelineHandle = {
  loadMore: () => void;
};

const ThumbnailCell = memo(({ status, cellSize }: { status: CatalystStatus; cellSize: number }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(true);

  return (
    <Pressable onPress={() => router.push(`/status/${status.id}`)} style={{ width: cellSize, height: cellSize }}>
      {media ? (
        <View style={{ width: cellSize, height: cellSize }}>
          <View className="relative">
            <Image
              source={{
                uri: getCdnUrl({
                  src: media.url,
                  variant: "tiny",
                  width: cellSize,
                }),
              }}
              style={{ width: cellSize, height: cellSize }}
              contentFit="cover"
              onLoadEnd={() => setIsImageLoading(false)}
            />
            {status.medias.some((w) => w.metadata?.isSensitive) && (
              <View className="absolute inset-0 flex items-center justify-center bg-light-skeleton dark:bg-dark-skeleton bg-opacity-50">
                <Text className="text-light-text dark:text-dark-text">Sensitive Content</Text>
              </View>
            )}
            {status.medias.some((w) => w.metadata?.isSpoiler) && (
              <View className="absolute inset-0 flex items-center justify-center bg-light-skeleton dark:bg-dark-skeleton bg-opacity-50">
                <Text className="text-light-text dark:text-dark-text">Spoiler Content</Text>
              </View>
            )}
          </View>
          {isImageLoading && (
            <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
              <ActivityIndicator />
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center bg-gray-200 dark:bg-gray-800">
          <MessageSquare size={24} color="#9CA3AF" />
        </View>
      )}
    </Pressable>
  );
});
ThumbnailCell.displayName = "ThumbnailCell";

export const UserTimeline = memo(
  React.forwardRef<UserTimelineHandle, Props>(({ user }, ref) => {
    const client = useAtomValue(clientAtom);
    const { width: screenWidth } = useWindowDimensions();
    const cellSize = (screenWidth - GAP * (COLUMNS - 1)) / COLUMNS;
    const [items, setItems] = useState<CatalystStatus[]>([]);
    const sets = useRef<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);

    const fetchItems = useCallback(async () => {
      if (!user) {
        return;
      }

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const { data } = await client.catalyst.v1.timeline.user.by.username.username.get({
          path: { username: user.screenName },
          query: {},
          throwOnError: true,
        });
        setItems((prev) => merge(prev, data.statuses, sets, (item) => item.id));
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [client, user]);

    const loadMore = useCallback(async () => {
      if (!user || isLoadingRef.current) {
        return;
      }

      const lastItem = items[items.length - 1];
      if (!lastItem) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const { data } = await client.catalyst.v1.timeline.user.by.username.username.get({
          path: { username: user.screenName },
          query: { until: lastItem.id },
          throwOnError: true,
        });

        setItems((prev) => merge(prev, data.statuses, sets, (item) => item.id));
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [user, items, client]);

    useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

    useAsyncOneTimeEffect(fetchItems);

    const rows: CatalystStatus[][] = [];
    for (let i = 0; i < items.length; i += COLUMNS) {
      rows.push(items.slice(i, i + COLUMNS));
    }

    return (
      <View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row" style={{ marginTop: rowIndex > 0 ? GAP : 0 }}>
            {row.map((item, colIndex) => (
              <View key={item.id} style={{ marginLeft: colIndex > 0 ? GAP : 0 }}>
                <ThumbnailCell status={item} cellSize={cellSize} />
              </View>
            ))}
          </View>
        ))}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </View>
    );
  }),
);
UserTimeline.displayName = "UserTimeline";
