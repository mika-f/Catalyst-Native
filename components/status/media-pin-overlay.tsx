import { CatalystBadge, CatalystBadgeText, CatalystText } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { openUrlWithBrowser } from "@/models/browser-settings";
import {
  EPICLESE_ITEM_TYPE_LABELS,
  getEpicleseItemUrl,
  type EpicleseReference,
} from "@/models/epiclese";
import type { Media } from "@/models/sdk-types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { ExternalLink, Tags } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniExternalLink = withUniwind(ExternalLink);

type Props = {
  media: Media;
  references: EpicleseReference[];
  /** ピンを重ねる表示領域（画像コンテナ）の幅 */
  width: number;
  /** ピンを重ねる表示領域（画像コンテナ）の高さ */
  height: number;
  visible: boolean;
  onToggleVisible: () => void;
};

// 写真上のピン（座標付きメタデータ）のオーバーレイ表示。
// x, y は元画像に対する 0-10000 の正規化座標（万分率）。画像は contain 表示のため、
// コンテナ内の実描画領域（レターボックス分を除いた矩形）を求めてから配置する。
export const MediaPinOverlay = ({ media, references, width, height, visible, onToggleVisible }: Props) => {
  const [selected, setSelected] = useState<EpicleseReference | null>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const theme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();

  const sortedReferences = useMemo(
    () => [...references].sort((a, b) => a.order - b.order),
    [references],
  );

  const contentRect = useMemo(() => {
    const imageWidth = media.metadata?.width ?? width;
    const imageHeight = media.metadata?.height ?? height;
    const imageRatio = imageWidth / imageHeight;
    const boxRatio = width / height;

    if (imageRatio > boxRatio) {
      const contentHeight = width / imageRatio;
      return { x: 0, y: (height - contentHeight) / 2, width, height: contentHeight };
    }
    const contentWidth = height * imageRatio;
    return { x: (width - contentWidth) / 2, y: 0, width: contentWidth, height };
  }, [media, width, height]);

  const openDetail = useCallback((reference: EpicleseReference) => {
    setSelected(reference);
    detailSheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  return (
    <>
      <View className="absolute inset-0" pointerEvents="box-none">
        {visible &&
          sortedReferences.map((reference, i) => {
            const left = contentRect.x + (reference.x / 10000) * contentRect.width;
            const top = contentRect.y + (reference.y / 10000) * contentRect.height;
            // ラベルは画像中心から見て外側（ピンが右半分なら右、左半分なら左）に表示する
            const labelOnRight = reference.x > 5000;

            return (
              <Pressable
                key={`${reference.reference}:${i}`}
                accessibilityRole="button"
                accessibilityLabel={reference.name}
                hitSlop={8}
                onPress={() => openDetail(reference)}
                className="absolute flex-row items-center gap-1.5 active:opacity-80"
                // ドット（16px）の中心が (left, top) に一致するよう、行の起点を半径分ずらす。
                // ラベルが左向きのときはコンテナが左方向に伸びるよう right 基準で配置する
                style={
                  labelOnRight
                    ? { left: left - 8, top: top - 12 }
                    : { right: width - left - 8, top: top - 12 }
                }
              >
                {labelOnRight ? null : <PinLabel name={reference.name} />}
                <View className="size-4 rounded-full border-2 border-white bg-light-accent dark:bg-dark-accent" />
                {labelOnRight ? <PinLabel name={reference.name} /> : null}
              </Pressable>
            );
          })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? "写真上のタグを非表示" : "写真上のタグを表示"}
          onPress={onToggleVisible}
          className={cn(
            "absolute bottom-3 right-3 size-9 items-center justify-center rounded-full active:bg-black/80",
            visible ? "bg-black/60" : "bg-black/40",
          )}
        >
          <Tags size={16} color="white" />
        </Pressable>
      </View>

      {/* ピンのアイテム詳細シート */}
      <BottomSheetModal
        ref={detailSheetRef}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
      >
        <BottomSheetView style={{ paddingBottom: insets.bottom + 16 }}>
          {selected ? (
            <View className="gap-3 px-5 pt-2">
              <View className="flex-row">
                <CatalystBadge tone="accent">
                  <CatalystBadgeText>{EPICLESE_ITEM_TYPE_LABELS[selected.type] ?? selected.type}</CatalystBadgeText>
                </CatalystBadge>
              </View>
              <Pressable
                accessibilityRole="link"
                className="active:opacity-75"
                onPress={() => openUrlWithBrowser(getEpicleseItemUrl(selected.reference))}
              >
                <CatalystText variant="subtitle" tone="tint">
                  {selected.name}
                </CatalystText>
              </Pressable>
              <CatalystText variant="caption" tone="muted">
                作者: {selected.author.name}
              </CatalystText>
              {selected.externalUrl ? (
                <Pressable
                  accessibilityRole="link"
                  className="flex-row items-center gap-1.5 active:opacity-75"
                  onPress={() => selected.externalUrl && openUrlWithBrowser(selected.externalUrl)}
                >
                  <UniExternalLink size={14} className="text-light-link dark:text-dark-link" />
                  <CatalystText variant="caption" tone="link">
                    販売ページを見る
                  </CatalystText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const PinLabel = ({ name }: { name: string }) => {
  return (
    <View className="max-w-40 rounded-md bg-black/70 px-2 py-1">
      <Text className="text-xs font-medium text-white" numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
};
