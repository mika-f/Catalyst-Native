import { BottomSheetItem } from "@/components/bottom-sheet/item";
import { BottomSheetModal, type BottomSheetModalHandle } from "@/components/bottom-sheet/sheet";
import { TimelineBase } from "@/components/timeline/base";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { getCdnUrl } from "@/lib/media";
import { merge } from "@/lib/merge";
import { buildShareText } from "@/lib/share";
import { accountAtom } from "@/models/atoms/account";
import { openUrlWithBrowser } from "@/models/browser-settings";
import type {
  CatalystAlbum,
  CatalystAlbumDisplayMode,
  CatalystSmartAlbum,
  CatalystStatus,
  Media,
} from "@/models/sdk-types";
import dayjs from "dayjs";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Calendar, Copy, ExternalLink, FileQuestion, MessageSquare, MoreHorizontal, Pencil, Send } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";
import { clientAtom } from "@/models/atoms/credential";

const UniCalendar = withUniwind(Calendar);
const UniCopy = withUniwind(Copy);
const UniExternalLink = withUniwind(ExternalLink);
const UniFileQuestion = withUniwind(FileQuestion);
const UniImage = withUniwind(Image);
const UniMessageSquare = withUniwind(MessageSquare);
const UniMoreHorizontal = withUniwind(MoreHorizontal);
const UniPencil = withUniwind(Pencil);
const UniSend = withUniwind(Send);

const GRID_COLUMNS = 3;
const GRID_GAP = 1;
const GALLERY_COLUMNS = 2;
const GALLERY_GAP = 2;
const LOAD_MORE_THRESHOLD = 200;

type AlbumType = "album" | "smartAlbum";

type AlbumInfo = {
  title: string;
  description: string;
  user?: CatalystAlbum["user"];
  since?: string;
  until?: string;
  mode: CatalystAlbumDisplayMode;
};

type Props = {
  id: string;
  albumType: AlbumType;
};

type GalleryItem = {
  key: string;
  statusId: string;
  media: Media;
};

const formatPeriod = (since?: string, until?: string): string => {
  if (!since && !until) return "";

  const fmt = (d: string) => dayjs(d).format("YYYY/MM/DD");

  if (since && until) return `${fmt(since)} - ${fmt(until)}`;
  if (since) return `${fmt(since)} から`;
  if (until) return `${fmt(until)} まで`;
  return "";
};

const AlbumHeader = ({ info }: { info: AlbumInfo }) => {
  const router = useRouter();
  const { user, description, since, until } = info;
  const period = formatPeriod(since, until);

  const hasContent = user || description.length > 0 || period.length > 0;
  if (!hasContent) return null;

  return (
    <View className="px-4 py-3 bg-light-background dark:bg-dark-background">
      {user && (
        <TouchableOpacity
          className="flex-row items-center mb-2"
          activeOpacity={0.7}
          onPress={() => router.push(`/user/${user.screenName}`)}
        >
          {user.profile?.iconUrl ? (
            <UniImage
              source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 }) }}
              className="w-8 h-8 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-8 h-8 rounded-full bg-light-skeleton dark:bg-dark-skeleton" />
          )}
          <View className="ml-2">
            <Text className="text-sm font-semibold text-light-text dark:text-dark-text">{user.displayName}</Text>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">@{user.screenName}</Text>
          </View>
        </TouchableOpacity>
      )}

      {description.length > 0 && (
        <Text className="text-sm text-light-text-muted dark:text-dark-text-muted mb-1" numberOfLines={3}>
          {description}
        </Text>
      )}

      {period.length > 0 && (
        <View className="flex-row items-center gap-1">
          <UniCalendar size={12} className="text-light-text-muted dark:text-dark-text-muted" />
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">{period}</Text>
        </View>
      )}
    </View>
  );
};

const EmptyState = () => (
  <View className="items-center justify-center px-6 py-16">
    <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">まだ投稿がありません</Text>
  </View>
);

const GridCell = memo(({ status, cellSize }: { status: CatalystStatus; cellSize: number }) => {
  const router = useRouter();
  const media = status.medias[0];
  const [isImageLoading, setIsImageLoading] = useState(Boolean(media));
  const [realId] = status.id.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ width: cellSize, height: cellSize }}>
      {media ? (
        <View style={{ width: cellSize, height: cellSize }}>
          <UniImage
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
          {isImageLoading && (
            <View className="absolute inset-0 items-center justify-center bg-light-skeleton dark:bg-dark-skeleton">
              <ActivityIndicator />
            </View>
          )}
        </View>
      ) : (
        <View className="flex-1 items-center justify-center bg-light-surface dark:bg-dark-surface">
          <UniMessageSquare size={24} className="text-light-text-muted dark:text-dark-text-muted" />
        </View>
      )}
    </Pressable>
  );
});
GridCell.displayName = "GridCell";

const GalleryCell = memo(({ item, columnWidth }: { item: GalleryItem; columnWidth: number }) => {
  const router = useRouter();
  const [isImageLoading, setIsImageLoading] = useState(true);

  const aspectRatio =
    item.media.metadata?.width && item.media.metadata?.height
      ? item.media.metadata.width / item.media.metadata.height
      : 1;
  const cellHeight = columnWidth / aspectRatio;
  const [realId] = item.statusId.split("/");

  return (
    <Pressable onPress={() => router.push(`/status/${realId}`)} style={{ marginBottom: GALLERY_GAP }}>
      <View style={{ width: columnWidth, height: cellHeight, borderRadius: 4, overflow: "hidden" }}>
        <UniImage
          source={{
            uri: getCdnUrl({
              src: item.media.url,
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

const distributeToColumns = (items: GalleryItem[], columnWidth: number): [GalleryItem[], GalleryItem[]] => {
  const columns: [GalleryItem[], GalleryItem[]] = [[], []];
  const heights = [0, 0];

  for (const item of items) {
    const aspectRatio =
      item.media.metadata?.width && item.media.metadata?.height
        ? item.media.metadata.width / item.media.metadata.height
        : 1;
    const cellHeight = columnWidth / aspectRatio;
    const shorter = heights[0] <= heights[1] ? 0 : 1;

    columns[shorter].push(item);
    heights[shorter] += cellHeight + GALLERY_GAP;
  }

  return columns;
};

const expandGalleryItems = (statuses: CatalystStatus[]): GalleryItem[] => {
  return statuses.flatMap((status) =>
    status.medias.map((media) => ({
      key: `${status.id}:${media.id}`,
      statusId: status.id,
      media,
    })),
  );
};

const AlbumVisualContent = ({
  mode,
  fetcher,
}: {
  mode: Extract<CatalystAlbumDisplayMode, "grid" | "gallery">;
  fetcher: (since: string | null, until: string | null) => Promise<CatalystStatus[]>;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<CatalystStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  const sets = useRef<Set<string>>(new Set());

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const result = await fetcher(null, null);
      sets.current = new Set();
      setItems((prev) => merge(prev, result, sets, (item) => item.id));
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetcher]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const since = items[0]?.id ?? null;
      const newItems = await fetcher(since, null);
      if (newItems.length > 0) {
        const trulyNew = newItems.filter((item) => !sets.current.has(item.id));
        if (trulyNew.length > 0) {
          trulyNew.forEach((item) => sets.current.add(item.id));
          setItems((prev) => [...trulyNew, ...prev]);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [fetcher, items]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current) return;

    const until = items[items.length - 1]?.id ?? null;
    if (!until) return;

    setIsLoading(true);
    isLoadingRef.current = true;
    try {
      const newItems = await fetcher(null, until);
      if (newItems.length > 0) {
        setItems((prev) => merge(prev, newItems, sets, (item) => item.id));
      }
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [fetcher, items]);

  useAsyncOneTimeEffect(loadInitial);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isLoadingRef.current) return;

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
        loadMore();
      }
    },
    [loadMore],
  );

  if (mode === "grid") {
    const cellSize = (screenWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const rows: CatalystStatus[][] = [];
    for (let i = 0; i < items.length; i += GRID_COLUMNS) {
      rows.push(items.slice(i, i + GRID_COLUMNS));
    }

    return (
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {rows.length === 0 && !isLoading ? <EmptyState /> : null}
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} className="flex-row" style={{ marginTop: rowIndex > 0 ? GRID_GAP : 0 }}>
            {row.map((item, colIndex) => (
              <View key={item.id} style={{ marginLeft: colIndex > 0 ? GRID_GAP : 0 }}>
                <GridCell status={item} cellSize={cellSize} />
              </View>
            ))}
          </View>
        ))}
        {isLoading && (
          <View className="py-4">
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>
    );
  }

  const columnWidth = (screenWidth - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;
  const galleryItems = expandGalleryItems(items);
  const [leftColumn, rightColumn] = distributeToColumns(galleryItems, columnWidth);

  return (
    <ScrollView
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {leftColumn.length === 0 && rightColumn.length === 0 && !isLoading ? <EmptyState /> : null}
      <View className="flex-row" style={{ gap: GALLERY_GAP }}>
        <View style={{ width: columnWidth }}>
          {leftColumn.map((item) => (
            <GalleryCell key={item.key} item={item} columnWidth={columnWidth} />
          ))}
        </View>
        <View style={{ width: columnWidth }}>
          {rightColumn.map((item) => (
            <GalleryCell key={item.key} item={item} columnWidth={columnWidth} />
          ))}
        </View>
      </View>
      {isLoading && (
        <View className="py-4">
          <ActivityIndicator />
        </View>
      )}
    </ScrollView>
  );
};

export const AlbumDetailPage = ({ id, albumType }: Props) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const [albumInfo, setAlbumInfo] = useState<AlbumInfo | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const router = useRouter();
  const menuSheetRef = useRef<BottomSheetModalHandle>(null);

  const canEdit = albumInfo?.user && account?.user ? albumInfo.user.id === account.user.id : false;

  const albumUrl =
    albumType === "album"
      ? `https://catalyst.natsuneko.com/album/${id}`
      : `https://catalyst.natsuneko.com/smart-album/${id}`;

  const showMenu = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const handleShare = useCallback(() => {
    menuSheetRef.current?.dismiss();
    const text = buildShareText(albumInfo?.title ?? "", albumInfo?.user?.displayName ?? "", "");
    if (Platform.OS === "ios") {
      Share.share({ message: text, url: albumUrl });
    } else {
      Share.share({ message: `${text}\n${albumUrl}` });
    }
  }, [albumInfo, albumUrl]);

  const handleCopyUrl = useCallback(() => {
    menuSheetRef.current?.dismiss();
    Clipboard.setStringAsync(albumUrl);
  }, [albumUrl]);

  const handleOpenBrowser = useCallback(() => {
    menuSheetRef.current?.dismiss();
    openUrlWithBrowser(albumUrl);
  }, [albumUrl]);

  useEffect(() => {
    if (!id) return;

    const fetchInfo = async () => {
      try {
        if (albumType === "album") {
          const { data: album } = await client.catalyst.v1.album.by.id.id.get({
            path: { id },
            throwOnError: true,
          });
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user,
            mode: album.mode,
          });
        } else {
          const { data: album } = await client.catalyst.v1.smartAlbum.by.id.id.get({
            path: { id },
            throwOnError: true,
          });
          setAlbumInfo({
            title: album.name,
            description: album.description,
            user: album.user ?? undefined,
            since: album.since ?? undefined,
            until: album.until ?? undefined,
            mode: album.mode,
          });
        }
      } catch {
        setIsNotFound(true);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInfo();
  }, [client, id, albumType]);

  const fetcher = useCallback(
    async (since: string | null, until: string | null): Promise<CatalystStatus[]> => {
      const opts: { since?: string; until?: string } = {};
      if (since) opts.since = since;
      if (until) opts.until = until;

      if (albumType === "album") {
        const { data: album } = await client.catalyst.v1.album.by.id.id.get({
          path: { id },
          query: opts,
          throwOnError: true,
        });
        return album.statuses;
      }
      const { data: album } = await client.catalyst.v1.smartAlbum.by.id.id.get({
        path: { id },
        query: opts,
        throwOnError: true,
      });
      return album.statuses;
    },
    [client, id, albumType],
  );

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerBackTitle: "戻る" }} />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (isNotFound) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerBackTitle: "戻る" }} />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <UniFileQuestion size={64} className="text-light-gray dark:text-dark-gray" />
          <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
            {albumType === "album" ? "アルバム" : "スマートアルバム"}が見つかりません
          </Text>
          <Text className="text-sm text-light-gray dark:text-dark-gray mt-2 text-center">
            削除されたか、アクセスできないコンテンツです
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: albumInfo?.title ?? "",
          headerBackTitle: "戻る",
          headerRight: () => (
            <View className="flex-row items-center">
              {canEdit && (
                <TouchableOpacity
                  style={{ padding: 8 }}
                  onPress={() => {
                    if (albumType === "album") {
                      router.push(`/album/${id}/edit`);
                    } else {
                      router.push(`/smart-album/${id}/edit`);
                    }
                  }}
                >
                  <UniPencil size={20} className="text-light-tint dark:text-dark-tint" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{ padding: 8 }} onPress={showMenu}>
                <UniMoreHorizontal size={20} className="text-light-tint dark:text-dark-tint" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {albumInfo && <AlbumHeader info={albumInfo} />}
        {albumInfo && <View className="h-px bg-light-divider dark:bg-dark-divider" />}
        {albumInfo?.mode === "timeline" ? (
          <TimelineBase fetcher={fetcher} ListEmptyComponent={EmptyState} />
        ) : (
          <AlbumVisualContent mode={albumInfo!.mode} fetcher={fetcher} />
        )}
      </View>
      <BottomSheetModal ref={menuSheetRef}>
        <BottomSheetItem prefixIcon={UniSend} title="共有する" onPress={handleShare} highlight />
        <BottomSheetItem prefixIcon={UniCopy} title="URL をコピー" onPress={handleCopyUrl} />
        <BottomSheetItem prefixIcon={UniExternalLink} title="ブラウザで開く" onPress={handleOpenBrowser} />
      </BottomSheetModal>
    </>
  );
};
