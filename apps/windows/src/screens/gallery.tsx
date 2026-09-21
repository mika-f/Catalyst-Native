import { clientAtom } from "@/atoms/credential";
import { Page, PageHeader } from "@/components/page";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { useContainerWidth } from "@/layout/breakpoints";
import * as ArrayUtils from "@/lib/array";
import { getCdnUrl } from "@/models/cdn";
import { CatalystStatus } from "@/models/sdk-types";
import { Navigation } from "@natsuneko-laboratory/react-native-desktop-navigation";
import { FlashList, useRecyclingState } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, View } from "react-native";

const MIN = 300;
const MAX = 400;
const GAP = 4;

// masonry では各セルの幅は FlashList が「コンテナ幅 / カラム数」で強制するため、ここではカラム数だけを決める
const getColumnCount = (width: number): number => {
  return Math.max(1, Math.floor(width / MIN), Math.ceil(width / MAX));
}

const GalleryCell = memo(({ item, navigation }: { item: CatalystStatus; navigation: Navigation }) => {
  const media = item.medias[0];
  // セルはリサイクルされるため、別アイテムに再利用されたら読み込み状態をリセットする
  const [isImageLoading, setIsImageLoading] = useRecyclingState(true, [item.id]);
  if (!media) {
    return null;
  }

  const aspectRatio = media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
  const [realId] = item.id.split("/");

  // 幅は FlashList が割り当てたカラム幅いっぱいに広げ、高さは aspectRatio から決める
  // RNW の ImageComponentView は source が変わっても前の画像サイズの DrawingSurface を使い回すため、
  // FlashList にセルをリサイクルされると新しい画像が前の画像の寸法で描かれてずれる。key で毎回ネイティブビューを作り直す
  return <Pressable style={{ padding: GAP / 2 }}>
    <View className="w-full overflow-hidden rounded-sm" style={{ aspectRatio }}>
      <Image key={item.id} source={{ uri: getCdnUrl({ src: media.url, variant: "medium", width: 500 }) }} style={{ width: "100%", height: "100%" }} onLoadEnd={(() => setIsImageLoading(false))} />
      {isImageLoading && <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
        <ActivityIndicator />
      </View>}
    </View>
  </Pressable>
});
GalleryCell.displayName = "GalleryCell";

export const GalleryScreen = ({ navigation }: { navigation: Navigation }) => {
  const client = useAtomValue(clientAtom);
  const container = useContainerWidth();
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  const sets = useRef<Set<string>>(new Set());
  const columns = useMemo(() => getColumnCount(container.width), [container.width]);

  const fetchItems = useCallback(async () => {
    setIsInitialLoading(true);
    isLoadingRef.current = true;

    try {
      const { data } = await client.catalyst.v1.timeline.gallery.get({ query: {}, throwOnError: true });
      setItems((prev) => ArrayUtils.merge(prev, data.statuses, sets, (item) => item.id));
    } finally {
      setIsInitialLoading(false);
      isLoadingRef.current = false;
    }
  }, [client]);

  const onRefresh = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    setIsRefreshing(true);
    isLoadingRef.current = true;

    try {
      const since = items.length > 0 ? items[0].id : undefined;
      const { data } = await client.catalyst.v1.timeline.gallery.get({ query: { since }, throwOnError: true });
      const newItems = data.statuses;

      if (newItems.length > 0) {
        setItems((prev) => ArrayUtils.merge(prev, newItems, sets, (item) => item.id));
      }
    } finally {
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [items, client]);

  const onEndReached = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    setIsLoadingMore(true);
    isLoadingRef.current = true;

    try {
      const until = items.length > 0 ? items[items.length - 1].id : undefined;
      const { data } = await client.catalyst.v1.timeline.gallery.get({ query: { until }, throwOnError: true });
      const newItems = data.statuses;

      if (newItems.length > 0) {
        setItems((prev) => ArrayUtils.merge(prev, newItems, sets, (item) => item.id));
      }
    } finally {
      setIsLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [items, client]);

  useAsyncOneTimeEffect(fetchItems);

  return <Page wide rightRail={false} scroll={false} header={<PageHeader title="ギャラリー" subtitle="Catalyst に投稿された写真を、タイムラインよりも写真中心のレイアウトで眺められます。" />}>
    <FlashList
      data={items}
      keyExtractor={w => w.id}
      renderItem={({ item }) => <GalleryCell item={item} navigation={navigation} />}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      numColumns={columns}
      masonry
      onLayout={container.onLayout}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.75}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator className="py-4" /> : null}
    />
  </Page>
};