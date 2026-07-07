import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import React from "react";
import { Platform, Pressable, ScrollView, Switch, Text, TextInput, View, useColorScheme } from "react-native";

const DISPLAY_MODE_OPTIONS: { value: CatalystAlbumDisplayMode; label: string }[] = [
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
  const theme = useColorScheme() ?? "light";

  return (
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
      {/* 基本情報セクション */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-light-text dark:text-dark-text">基本情報</Text>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="タイトル"
          placeholderTextColor={theme === "dark" ? "#666" : "#999"}
          className="rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
          style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
        />
        <TextInput
          value={description}
          onChangeText={onChangeDescription}
          multiline
          placeholder="説明（任意）"
          placeholderTextColor={theme === "dark" ? "#666" : "#999"}
          className="min-h-[100px] rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
          textAlignVertical="top"
        />
      </View>

      <View className="h-px bg-light-divider dark:bg-dark-divider" />

      {/* 表示モードセクション */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-light-text dark:text-dark-text">表示モード</Text>
        <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
          アルバム内の投稿の表示方法を選択します
        </Text>
        <View className="flex-row gap-0 overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
          {DISPLAY_MODE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onChangeDisplayMode(option.value)}
              className={`flex-1 items-center py-2 ${
                displayMode === option.value
                  ? "bg-light-accent dark:bg-dark-accent"
                  : "bg-light-surface dark:bg-dark-surface"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  displayMode === option.value
                    ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                    : "text-light-text dark:text-dark-text"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="h-px bg-light-divider dark:bg-dark-divider" />

      {/* プライバシーセクション */}
      <View className="gap-3">
        <Text className="text-base font-semibold text-light-text dark:text-dark-text">プライバシー</Text>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 text-sm text-light-text dark:text-dark-text">公開アルバム</Text>
          <Switch value={isPublic} onValueChange={onChangeIsPublic} />
        </View>
        <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
          {isPublic
            ? "すべてのユーザーがこのアルバムを閲覧できます"
            : "自分のみがこのアルバムを閲覧できます"}
        </Text>
      </View>

      {footer}
    </ScrollView>
  );
};
