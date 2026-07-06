import { accountAtom } from "@/models/atoms/account";
import { ContestSelectorSheet, type ContestSelectorSheetRef } from "@/components/contest-selector-sheet";
import type { CatalystContest } from "@natsuneko-laboratory/catalyst-sdk";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Image as ImageIcon, Trophy, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniImageIcon = withUniwind(ImageIcon);
const UniTrophy = withUniwind(Trophy);
const UniX = withUniwind(X);

const MAX_CHARACTER_COUNT = 1000;
const MAX_IMAGE_COUNT = 10;

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
};

type Privacy = "public" | "quiet_public" | "followers" | "private";

const PRIVACY_OPTIONS: { value: Privacy; label: string; description: string }[] = [
  { value: "public", label: "公開", description: "すべてのユーザーに公開されます" },
  { value: "quiet_public", label: "静かに公開", description: "公開されますが、タイムラインには表示されません" },
  { value: "followers", label: "フォロワー", description: "フォロワーのみに表示されます" },
  { value: "private", label: "非公開", description: "自分のみに表示されます" },
];

export default function PostComposerScreen() {
  const theme = useColorScheme() ?? "light";
  const router = useRouter();
  const params = useLocalSearchParams<{ contest?: string | string[] }>();
  const account = useAtomValue(accountAtom);

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [text, setText] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [isNsfw, setIsNsfw] = useState(false);
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isPrivateMetadata, setIsPrivateMetadata] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContest, setSelectedContest] = useState<CatalystContest | null>(null);

  const contestSelectorRef = useRef<ContestSelectorSheetRef>(null);
  const contestSlug = Array.isArray(params.contest) ? params.contest[0] : params.contest;

  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_CHARACTER_COUNT;
  const canAddMoreImages = images.length < MAX_IMAGE_COUNT;

  const canPost = useMemo(() => {
    if (isSubmitting || isOverLimit) return false;
    if (images.length > 0) return true;
    return text.trim().length > 0;
  }, [isSubmitting, isOverLimit, images.length, text]);

  useEffect(() => {
    let ignore = false;

    const restoreContest = async () => {
      if (!account || !contestSlug || selectedContest?.slug === contestSlug) return;

      const result = await account.credential.client.catalyst.getContestBySlug(contestSlug);
      if (!ignore) {
        setSelectedContest(result);
      }
    };

    restoreContest().catch((error) => {
      console.error("Failed to restore selected contest:", error);
    });

    return () => {
      ignore = true;
    };
  }, [account, contestSlug, selectedContest?.slug]);

  const handlePickImages = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGE_COUNT - images.length,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages: SelectedImage[] = result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? undefined,
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGE_COUNT));
    }
  }, [images.length]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || !account) return;

    setIsSubmitting(true);

    try {
      const client = account.credential.client;
      const mediaList: { url: string; alt: string; width: number; height: number; bytes: number }[] = [];

      for (const image of images) {
        const uploadUrls = await client.media.upload();
        const file = new FileSystem.File(image.uri);
        const ab = await file.arrayBuffer();

        await fetch(uploadUrls.signedUrl, {
          method: "PUT",
          body: ab,
          headers: { "Content-Type": "image/jpeg" },
        });

        mediaList.push({
          url: uploadUrls.url,
          alt: "",
          width: image.width,
          height: image.height,
          bytes: image.fileSize ?? 0,
        });
      }

      const result = await client.catalyst.createStatus({
        description: text.trim(),
        isNsfw,
        isSpoiler,
        isSubmitToContest: selectedContest !== null,
        isHidingLikeAndViewCount: false,
        isPrivateMetadata,
        isAllowComments: true,
        privacy,
        contestId: selectedContest?.slug,
        media: mediaList,
      });

      router.dismiss();
      router.push(`/status/${result.id}`);
    } catch (error) {
      console.error("Failed to create status:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "投稿に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [canPost, account, images, text, isNsfw, isSpoiler, isPrivateMetadata, privacy, selectedContest, router]);

  const handleContestSelect = useCallback((contest: CatalystContest) => {
    setSelectedContest(contest);
  }, []);

  const selectedPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;

  return (
    <>
      <ContestSelectorSheet ref={contestSelectorRef} onSelect={handleContestSelect} />
      <Stack.Screen
        options={{
          title: "新しい投稿",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canPost}>
              <Text
                className={`text-base font-semibold ${canPost ? "text-light-accent dark:text-dark-accent" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
              >
                投稿
              </Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
          </View>
        )}
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
          {/* 画像セクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">画像</Text>
            {images.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {images.map((image, index) => (
                  <View key={image.uri} className="relative">
                    <Image source={{ uri: image.uri }} className="h-25 w-25 rounded-lg" resizeMode="cover" />
                    <Pressable
                      onPress={() => handleRemoveImage(index)}
                      className="absolute -right-1.5 -top-1.5 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    >
                      <UniX size={14} className="text-white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {canAddMoreImages && (
              <Pressable onPress={handlePickImages} className="flex-row items-center gap-2">
                <UniImageIcon size={18} className="text-light-tint dark:text-dark-tint" />
                <Text className="text-sm text-light-tint dark:text-dark-tint">
                  画像を追加 ({images.length}/{MAX_IMAGE_COUNT})
                </Text>
              </Pressable>
            )}
            {images.length > 0 && (
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">最大10枚まで選択できます</Text>
            )}
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* キャプションセクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">キャプション</Text>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {images.length === 0
                ? "画像がない場合は本文が必須です"
                : "画像に添えるキャプションを入力できます（任意）"}
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder="本文を入力..."
              placeholderTextColor={theme === "dark" ? "#666" : "#999"}
              className="min-h-20 rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
              textAlignVertical="top"
            />
            <Text
              className={`text-right text-xs ${isOverLimit ? "text-light-error dark:text-dark-error" : "text-light-text-muted dark:text-dark-text-muted"}`}
            >
              {characterCount} / {MAX_CHARACTER_COUNT}
            </Text>
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* 閲覧設定セクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">閲覧設定</Text>
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm text-light-text dark:text-dark-text">
                  NSFW コンテンツとしてマークする
                </Text>
                <Switch value={isNsfw} onValueChange={setIsNsfw} />
              </View>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                センシティブなコンテンツや NSFW（職場で閲覧不可）コンテンツを NSFW
                としてフラグを付けずに繰り返し投稿した場合、複数回の警告に基づいて検索やタイムラインなどから非表示にする措置を講じる場合があります。
              </Text>
            </View>
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm text-light-text dark:text-dark-text">スポイラーを有効にする</Text>
                <Switch value={isSpoiler} onValueChange={setIsSpoiler} />
              </View>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                NSFW としてではなく、例えばネタバレ注意などと言った NSFW 以外の理由でスポイラー表示を有効にしたい場合に
                ON にしてください。
              </Text>
            </View>
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* コンテストセクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">コンテスト</Text>
            {selectedContest ? (
              <View className="flex-row items-center gap-3 rounded-lg border border-light-toggle-border dark:border-dark-toggle-border bg-light-toggle dark:bg-dark-toggle px-3 py-2.5">
                <UniTrophy size={18} className="text-light-toggle-icon dark:text-dark-toggle-icon" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-light-toggle-foreground dark:text-dark-toggle-foreground" numberOfLines={1}>
                    {selectedContest.title}
                  </Text>
                  {selectedContest.theme ? (
                    <Text className="text-xs text-light-toggle-foreground/70 dark:text-dark-toggle-foreground/70" numberOfLines={1}>
                      テーマ: {selectedContest.theme}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setSelectedContest(null)}
                  className="h-6 w-6 items-center justify-center rounded-full bg-black/10 dark:bg-white/10"
                >
                  <UniX size={14} className="text-light-toggle-foreground dark:text-dark-toggle-foreground" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => contestSelectorRef.current?.open()}
                className="flex-row items-center gap-2"
              >
                <UniTrophy size={18} className="text-light-tint dark:text-dark-tint" />
                <Text className="text-sm text-light-tint dark:text-dark-tint">
                  コンテストに参加する
                </Text>
              </Pressable>
            )}
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              コンテストに参加すると、この投稿がコンテストの応募作品として登録されます。
            </Text>
          </View>

          <View className="h-px bg-light-divider dark:bg-dark-divider" />

          {/* プライバシーセクション */}
          <View className="gap-3">
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">プライバシー</Text>
            <View className="flex-row gap-0 overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
              {PRIVACY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setPrivacy(option.value)}
                  className={`flex-1 items-center py-2 ${
                    privacy === option.value
                      ? "bg-light-accent dark:bg-dark-accent"
                      : "bg-light-surface dark:bg-dark-surface"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      privacy === option.value
                        ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                        : "text-light-text dark:text-dark-text"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
              {selectedPrivacy.description}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 text-sm text-light-text dark:text-dark-text">
                画像に埋め込まれたメタデータを表示しない
              </Text>
              <Switch value={isPrivateMetadata} onValueChange={setIsPrivateMetadata} />
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
