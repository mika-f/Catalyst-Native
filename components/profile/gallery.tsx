import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus, EgeriaUser } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useImperativeHandle, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View, useWindowDimensions } from "react-native";

const COLUMNS = 2;
const GAP = 2;

type Props = {
  user: EgeriaUser;
};

export type UserGalleryHandle = {
  loadMore: () => void;
};

const GalleryCell = memo(({ status, columnWidth }: { status: CatalystStatus; columnWidth: number }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(true);
  if (!media) return null;

  const aspectRatio =
    media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
  const cellHeight = columnWidth / aspectRatio;
  const [realId] = status.id.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ marginBottom: GAP }}>
      <View style={{ width: columnWidth, height: cellHeight, borderRadius: 4, overflow: "hidden" }}>
        <Image
          source={{
            uri: getCdnUrl({
              src: media.url,
              variant: "xsmall",
              width: columnWidth,
            }),
          }}
          style={{ width: columnWidth, height: cellHeight }}
          contentFit="cover"
          onLoadEnd={() => setIsImageLoading(false)}
        />
        {isImageLoading && (
          <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
            <ActivityIndicator colorClassName="accent-light-tint dark:accent-dark-tint" />
          </View>
        )}
      </View>
    </Pressable>
  );
});
GalleryCell.displayName = "GalleryCell";

function distributeToColumns(items: CatalystStatus[], columnWidth: number): [CatalystStatus[], CatalystStatus[]] {
  const columns: [CatalystStatus[], CatalystStatus[]] = [[], []];
  const heights = [0, 0];

  for (const item of items) {
    const media = item.medias[0];
    if (!media) continue;

    const aspectRatio =
      media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
    const cellHeight = columnWidth / aspectRatio;

    const shorter = heights[0] <= heights[1] ? 0 : 1;
    columns[shorter].push(item);
    heights[shorter] += cellHeight + GAP;
  }

  return columns;
}

export const UserGallery = memo(
  React.forwardRef<UserGalleryHandle, Props>(({ user }, ref) => {
    const client = useAtomValue(clientAtom);
    const { width: screenWidth } = useWindowDimensions();
    const columnWidth = (screenWidth - GAP * (COLUMNS - 1)) / COLUMNS;
    const [items, setItems] = useState<CatalystStatus[]>([]);
    const sets = useRef<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);

    const fetchItems = useCallback(async () => {
      if (!user) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const { data } = await client.catalyst.v1.timeline.user.by.username.username.gallery.get({
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
      if (!user || isLoadingRef.current) return;

      const lastItem = items[items.length - 1];
      if (!lastItem) return;

      setIsLoading(true);
      isLoadingRef.current = true;
      try {
        const { data } = await client.catalyst.v1.timeline.user.by.username.username.gallery.get({
          path: { username: user.screenName },
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
    }, [user, items, client]);

    useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

    useAsyncOneTimeEffect(fetchItems);

    const [leftColumn, rightColumn] = distributeToColumns(items, columnWidth);

    return (
      <View>
        <View className="flex-row" style={{ gap: GAP }}>
          <View style={{ width: columnWidth }}>
            {leftColumn.map((item) => (
              <GalleryCell key={item.id} status={item} columnWidth={columnWidth} />
            ))}
          </View>
          <View style={{ width: columnWidth }}>
            {rightColumn.map((item) => (
              <GalleryCell key={item.id} status={item} columnWidth={columnWidth} />
            ))}
          </View>
        </View>
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator colorClassName="accent-light-tint dark:accent-dark-tint" />
          </View>
        )}
      </View>
    );
  }),
);
UserGallery.displayName = "UserGallery";
