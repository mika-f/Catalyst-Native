import { clientAtom } from "@/atoms/credential";
import { Page, PageHeader } from "@/components/page";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { useContainerWidth } from "@/layout/breakpoints";
import * as ArrayUtils from "@/lib/array";
import { getColumnCount } from "@/lib/column";
import { getCdnUrl } from "@/models/cdn";
import { CatalystStatus } from "@/models/sdk-types";
import { Navigation } from "@natsuneko-laboratory/react-native-desktop-navigation";
import { FlashList, useRecyclingState } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { createContext, memo, useCallback, useContext, useMemo, useRef, useState, type Ref } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, View, type ViewProps } from "react-native";

const MIN = 300;
const MAX = 400;
const GAP = 4;

const getAspectRatio = (media: CatalystStatus["medias"][number]): number => {
  return media.metadata?.width && media.metadata?.height ? media.metadata.width / media.metadata.height : 1;
}

// セルの高さ / セルの幅。GalleryCell はセル全体を aspectRatio で決め、隙間は内側に描くので縦横比の逆数になる
const getCellHeightRatio = (item: CatalystStatus): number => {
  const media = item.medias[0];
  return media ? 1 / getAspectRatio(media) : 0;
}

type GallerySlot = { item: CatalystStatus; column: number; offsetRatio: number; heightRatio: number };

type GalleryLayout = { columns: number; slots: GallerySlot[]; overflowRatio: number };

// FlashList の masonry は計測した高さで「最も短いカラム」を選ぶため、リサイズ中に計測値が 1px ずれるだけで
// 同じ高さのカラムの選択が入れ替わり、以降のセルがカラムごと入れ替わってちらつく。
// 縦横比から高さは計算できるので、見た目のカラムの割り当てと縦位置 (セル幅に対する比) はここで決定的に求め、
// GalleryCellContainer でその位置に描く。FlashList 自身の配置は仮想化 (どのセルを描画するか) にだけ使われる
const buildLayout = (items: CatalystStatus[], columns: number): GalleryLayout => {
  const slots: GallerySlot[] = [];
  const heights: number[] = Array(columns).fill(0);
  for (const item of items) {
    const heightRatio = getCellHeightRatio(item);
    if (heightRatio <= 0) {
      continue;
    }

    let column = 0;
    for (let i = 1; i < columns; i++) {
      if (heights[i] < heights[column]) {
        column = i;
      }
    }

    slots.push({ item, column, offsetRatio: heights[column], heightRatio });
    heights[column] += heightRatio;
  }

  return { columns, slots, overflowRatio: Math.max(0, ...heights) - Math.min(...heights) };
}

// 仮想化は FlashList 自身の配置 (未計測のセルはアイテムタイプごとの平均の高さで推定) で行われるため、
// 推定がずれると buildLayout の位置では見えているセルが描画されず穴になる。縦横比ごとにタイプを分けて推定を実際の高さに揃える
const getSlotType = (slot: GallerySlot): string => {
  return `item-${slot.heightRatio.toFixed(2)}`;
}

const GalleryLayoutContext = createContext<GalleryLayout>({ columns: 1, slots: [], overflowRatio: 0 });

// FlashList はセルの left / top / width を JS で px 計算して絶対配置するため、ウィンドウを縮めると
// JS の再レイアウトが追いつくまでセルが古い幅のままはみ出し、ドラッグ中はそれが繰り返されてちらつく。
// セルの高さはすべてリスト幅に比例するので、位置を幅に対する割合で指定し、再レイアウトを待たずに Yoga だけでリサイズへ追従させる。
// left / width は親の幅に対する %。縦位置は RNW だと margin / top の % が親の高さ基準になり、translateY の % も丸めたセルの高さ基準で
// 下の方ほど誤差が拡大するため、aspectRatio で「セル幅 × offsetRatio」の高さを持つスペーサーを上に置いて押し下げる。
// FlashList が計測する ref / onLayout は内側の実セルに付け、スペーサーは計測にもタップにも関わらないようにする
const GalleryCellContainer = ({ ref, style, index, onLayout, ...props }: ViewProps & { ref?: Ref<View>; index: number }) => {
  const { columns, slots } = useContext(GalleryLayoutContext);
  const slot = slots[index];
  if (!slot) {
    return <View ref={ref} style={style} onLayout={onLayout} {...props} />;
  }

  return <View style={[style, { left: `${(slot.column * 100) / columns}%`, top: 0, width: `${100 / columns}%` }]} pointerEvents="box-none">
    {slot.offsetRatio > 0 && <View style={{ aspectRatio: 1 / slot.offsetRatio }} pointerEvents="none" />}
    <View ref={ref} onLayout={onLayout} {...props} />
  </View>;
};

const GalleryCell = memo(({ item, navigation }: { item: CatalystStatus; navigation: Navigation }) => {
  const media = item.medias[0];
  // セルはリサイクルされるため、別アイテムに再利用されたら読み込み状態をリセットする
  const [isImageLoading, setIsImageLoading] = useRecyclingState(true, [item.id]);
  if (!media) {
    return null;
  }

  const aspectRatio = getAspectRatio(media);
  const [realId] = item.id.split("/");

  // 幅は割り当てられたカラム幅いっぱいに広げ、高さは aspectRatio から決める。
  // セルの高さを幅に比例させるため (GalleryCellContainer)、隙間は padding ではなく内側の絶対配置で空ける
  // RNW の ImageComponentView は source が変わっても前の画像サイズの DrawingSurface を使い回すため、
  // FlashList にセルをリサイクルされると新しい画像が前の画像の寸法で描かれてずれる。key で毎回ネイティブビューを作り直す
  return <Pressable style={{ aspectRatio }}>
    <View className="absolute overflow-hidden rounded-sm" style={{ inset: GAP / 2 }}>
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
  const columns = useMemo(() => getColumnCount(container.width, MIN, MAX), [container.width]);
  const layout = useMemo(() => buildLayout(items, columns), [items, columns]);

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

  // リサイズのたびに GalleryScreen が再レンダリングされるため、全セルの再描画を避ける
  const renderItem = useCallback(({ item }: { item: GallerySlot }) => <GalleryCell item={item.item} navigation={navigation} />, [navigation]);

  useAsyncOneTimeEffect(fetchItems);

  return <Page wide rightRail={false} scroll={false} header={<PageHeader title="ギャラリー" subtitle="Catalyst に投稿された写真を、タイムラインよりも写真中心のレイアウトで眺められます。" />}>
    <GalleryLayoutContext.Provider value={layout}>
      <FlashList
        data={layout.slots}
        keyExtractor={(slot) => slot.item.id}
        getItemType={getSlotType}
        renderItem={renderItem}
        CellRendererComponent={GalleryCellContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        numColumns={columns}
        masonry
        // 可視判定はレイアウトの y がインデックス順に単調増加している前提の二分探索なので、
        // 投稿順のまま最も短いカラムへ積ませる (y は単調増加になる)。見た目の位置は buildLayout のものを使うため、
        // 計測誤差でカラムの選択が入れ替わっても FlashList 側の y が最大でセル 1 つ分ずれるだけで、その分を drawDistance で吸収する
        optimizeItemArrangement
        drawDistance={MAX * 3}
        onLayout={container.onLayout}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.75}
        ListFooterComponent={<>
          {/* FlashList のコンテンツの高さはカラムの割り当てが異なる分だけ実際より短くなり得るので、最大でカラム間の高さの差だけ下に余白を足す */}
          {layout.overflowRatio > 0 && <View style={{ aspectRatio: layout.columns / layout.overflowRatio }} pointerEvents="none" />}
          {isLoadingMore && <ActivityIndicator className="py-4" />}
        </>}
      />
    </GalleryLayoutContext.Provider>
  </Page>
};