import { CatalystSkeleton } from "@/components/design-system";
import { memo, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";

const TIMELINE_COLUMNS = 3;
const TIMELINE_GAP = 1;
const GALLERY_COLUMNS = 2;
const GALLERY_GAP = 2;

/** 3-column square grid (profile posts tab) */
export const ProfileTimelinePlaceholder = memo(({ rows = 4 }: { rows?: number }) => {
  const { width: screenWidth } = useWindowDimensions();
  const cellSize = (screenWidth - TIMELINE_GAP * (TIMELINE_COLUMNS - 1)) / TIMELINE_COLUMNS;
  const cells = rows * TIMELINE_COLUMNS;

  return (
    <View
      accessibilityLabel="投稿を読み込み中"
      accessibilityRole="progressbar"
      className="flex-row flex-wrap"
      style={{ gap: TIMELINE_GAP }}
    >
      {Array.from({ length: cells }, (_, index) => (
        <CatalystSkeleton
          key={index}
          style={{ width: cellSize, height: cellSize }}
        />
      ))}
    </View>
  );
});
ProfileTimelinePlaceholder.displayName = "ProfileTimelinePlaceholder";

const GALLERY_HEIGHTS = [0.75, 1.1, 0.9, 1.25, 0.85, 1.05, 0.95, 1.15] as const;

/** 2-column masonry-ish gallery skeleton */
export const ProfileGalleryPlaceholder = memo(({ count = 8 }: { count?: number }) => {
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = (screenWidth - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

  const columns = useMemo(() => {
    const left: number[] = [];
    const right: number[] = [];
    let leftH = 0;
    let rightH = 0;

    for (let i = 0; i < count; i++) {
      const ratio = GALLERY_HEIGHTS[i % GALLERY_HEIGHTS.length];
      const height = columnWidth * ratio;
      if (leftH <= rightH) {
        left.push(height);
        leftH += height + GALLERY_GAP;
      } else {
        right.push(height);
        rightH += height + GALLERY_GAP;
      }
    }

    return [left, right] as const;
  }, [columnWidth, count]);

  return (
    <View
      accessibilityLabel="ギャラリーを読み込み中"
      accessibilityRole="progressbar"
      className="flex-row"
      style={{ gap: GALLERY_GAP }}
    >
      {columns.map((heights, colIndex) => (
        <View key={colIndex} style={{ width: columnWidth }}>
          {heights.map((height, index) => (
            <CatalystSkeleton
              key={index}
              className="rounded"
              style={{ width: columnWidth, height, marginBottom: GALLERY_GAP }}
            />
          ))}
        </View>
      ))}
    </View>
  );
});
ProfileGalleryPlaceholder.displayName = "ProfileGalleryPlaceholder";

/** Album card list skeleton */
export const ProfileAlbumsPlaceholder = memo(({ count = 3 }: { count?: number }) => {
  return (
    <View
      accessibilityLabel="アルバムを読み込み中"
      accessibilityRole="progressbar"
      className="px-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} className="py-3">
          <CatalystSkeleton className="h-50 w-full rounded-xl" />
          <View className="mt-2 gap-1.5 px-1">
            <View className="flex-row items-center gap-2">
              <CatalystSkeleton className="h-4 flex-1 rounded-full" />
              <CatalystSkeleton className="h-6 w-14 rounded-full" />
            </View>
            <CatalystSkeleton className="h-3 w-4/5 rounded-full" />
            <CatalystSkeleton className="h-3 w-1/3 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
});
ProfileAlbumsPlaceholder.displayName = "ProfileAlbumsPlaceholder";
