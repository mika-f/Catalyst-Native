import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { merge } from "@/lib/merge";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { memo, useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View, useWindowDimensions } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";

const COLUMNS = 2;
const GAP = 2;

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
            <ActivityIndicator />
          </View>
        )}
      </View>
    </Pressable>
  );
});
GalleryCell.displayName = "GalleryCell";

export default function GalleryScreen() {
  const client = useAtomValue(clientAtom);
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - GAP * (COLUMNS - 1)) / COLUMNS;
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  const sets = useRef<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await client.catalyst.galleryTimeline({});
      setItems((prev) => merge(prev, result, sets, (item) => item.id));
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [client]);

  const onRefresh = useCallback(async () => {
    if (isLoadingRef.current) return;

    setIsRefreshing(true);
    isLoadingRef.current = true;

    try {
      const since = items.length > 0 ? items[0].id : null;
      const newItems = await client.catalyst.galleryTimeline({
        since: since || undefined,
      });

      if (newItems.length > 0) {
        setItems((prev) => merge(prev, newItems, sets, (item) => item.id));
      }
    } finally {
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [items, client]);

  const onLoadMore = useCallback(async () => {
    if (isLoadingRef.current) return;

    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await client.catalyst.galleryTimeline({
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

  useAsyncOneTimeEffect(fetchItems);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <FlashList
        data={items}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <GalleryCell key={item.id} status={item} columnWidth={columnWidth} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        numColumns={COLUMNS}
        masonry
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.75}
        ListFooterComponent={isLoading ? <ActivityIndicator className="py-4" /> : null}
      />
    </View>
  );
}
