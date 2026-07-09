import {
  CatalystDivider,
  CatalystListItem,
  CatalystListItemContent,
  CatalystText,
} from "@/components/design-system";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { BookImage, ChevronRight, Images, PenLine } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);
const UniPenLine = withUniwind(PenLine);
const UniImages = withUniwind(Images);
const UniBookImage = withUniwind(BookImage);

type ContentType = {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
};

const CONTENT_TYPES: ContentType[] = [
  {
    key: "post",
    title: "投稿",
    description: "最大10枚の写真を添付できます",
    icon: UniPenLine,
  },
  {
    key: "album",
    title: "アルバム",
    description: "複数の投稿をまとめたアルバムを作成します",
    icon: UniImages,
  },
  {
    key: "smartAlbum",
    title: "スマートアルバム",
    description: "ハッシュタグに基づいて自動更新されるアルバムを作成します",
    icon: UniBookImage,
  },
  {
    key: "fleet",
    title: "Fleet",
    description: "24時間で消えるデコレーションできる写真を投稿します",
    icon: UniPenLine,
  },
];

export type ContentTypeSelectorSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  ref: React.Ref<ContentTypeSelectorSheetRef>;
  onSelect: (contentType: string) => void;
};

export const ContentTypeSelectorSheet = ({ onSelect, ref }: Props) => {
  const theme = useColorScheme() ?? "light";
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const handleSelect = useCallback(
    (key: string) => {
      bottomSheetRef.current?.dismiss();
      onSelect(key);
    },
    [onSelect],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
      }}
      handleIndicatorStyle={{
        backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
      }}
    >
      <BottomSheetView style={{ paddingBottom: insets.bottom * 2 }}>
        <CatalystText variant="subtitle" className="py-3 text-center">
          作成するコンテンツを選択
        </CatalystText>
        <CatalystDivider />
        <View className="bg-light-background dark:bg-dark-surface">
          {CONTENT_TYPES.map((contentType, i) => (
            <View key={contentType.key}>
              <CatalystListItem
                divided={false}
                onPress={() => handleSelect(contentType.key)}
                className="min-h-18 px-5 py-3.5"
              >
                <View className="size-11 items-center justify-center rounded-xl bg-light-surface-muted dark:bg-dark-surface-muted">
                  <contentType.icon size={23} className="text-light-accent dark:text-dark-accent" />
                </View>
                <CatalystListItemContent>
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {contentType.title}
                  </CatalystText>
                  <CatalystText variant="caption" tone="muted">
                    {contentType.description}
                  </CatalystText>
                </CatalystListItemContent>
                <UniChevronRight size={16} className="text-light-text-subtle dark:text-dark-text-subtle" />
              </CatalystListItem>
              {i + 1 !== CONTENT_TYPES.length && <CatalystDivider className="ml-20 w-auto" />}
            </View>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
