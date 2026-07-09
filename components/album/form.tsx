import {
  CatalystDivider,
  CatalystSegmentedControl,
  CatalystSwitch,
  CatalystText,
  CatalystTextField,
} from "@/components/design-system";
import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import React from "react";
import { ScrollView, View } from "react-native";

const DISPLAY_MODE_OPTIONS: {
  value: CatalystAlbumDisplayMode;
  label: string;
}[] = [
  { value: "timeline", label: "タイムライン" },
  { value: "grid", label: "グリッド" },
  { value: "gallery", label: "ギャラリー" },
];

type Props = {
  title: string;
  onChangeTitle: (value: string) => void;
  description: string;
  onChangeDescription: (value: string) => void;
  displayMode: CatalystAlbumDisplayMode;
  onChangeDisplayMode: (value: CatalystAlbumDisplayMode) => void;
  isPublic: boolean;
  onChangeIsPublic: (value: boolean) => void;
  footer?: React.ReactNode;
};

export const AlbumForm = ({
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  displayMode,
  onChangeDisplayMode,
  isPublic,
  onChangeIsPublic,
  footer,
}: Props) => {
  return (
    <ScrollView
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      contentContainerClassName="pb-8"
    >
      {/* 基本情報セクション */}
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          基本情報
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-14 px-5 py-3">
            <CatalystTextField
              value={title}
              onChangeText={onChangeTitle}
              placeholder="タイトル"
            />
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <View className="px-5 py-3">
            <CatalystTextField
              value={description}
              onChangeText={onChangeDescription}
              multiline
              placeholder="説明（任意）"
            />
          </View>
        </View>
      </View>

      {/* 表示モードセクション */}
      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          表示モード
        </CatalystText>
        <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
          <CatalystSegmentedControl
            options={DISPLAY_MODE_OPTIONS}
            value={displayMode}
            onValueChange={onChangeDisplayMode}
          />
        </View>
        <CatalystText
          variant="caption"
          tone="subtle"
          className="px-5 pt-2 leading-4"
        >
          アルバム内の投稿の表示方法を選択します
        </CatalystText>
      </View>

      {/* プライバシーセクション */}
      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          プライバシー
        </CatalystText>
        <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
          <View className="mr-4 flex-1">
            <CatalystText
              variant="subtitle"
              className="text-[15px] font-semibold"
            >
              公開アルバム
            </CatalystText>
            <CatalystText variant="caption" tone="muted">
              {isPublic
                ? "すべてのユーザーがこのアルバムを閲覧できます"
                : "自分のみがこのアルバムを閲覧できます"}
            </CatalystText>
          </View>
          <CatalystSwitch value={isPublic} onValueChange={onChangeIsPublic} />
        </View>
      </View>

      {footer}
    </ScrollView>
  );
};
