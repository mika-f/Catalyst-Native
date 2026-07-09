import {
  CatalystButton,
  CatalystButtonIcon,
  CatalystButtonText,
  CatalystDivider,
  CatalystSegmentedControl,
  CatalystSwitch,
  CatalystText,
  CatalystTextField,
} from "@/components/design-system";
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
  View,
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
              <CatalystText variant="subtitle" tone={canPost ? "accent" : "subtle"}>
                投稿
              </CatalystText>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
          </View>
        )}
        <ScrollView className="flex-1" contentContainerClassName="pb-8">
          {/* 画像セクション */}
          <View className="pt-2">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              画像
            </CatalystText>
            <View className="bg-light-background dark:bg-dark-surface">
              {images.length > 0 && (
                <View className="flex-row flex-wrap gap-2 px-5 py-3">
                  {images.map((image, index) => (
                    <View key={image.uri} className="relative">
                      <Image source={{ uri: image.uri }} className="h-24 w-24 rounded-lg" resizeMode="cover" />
                      <Pressable
                        onPress={() => handleRemoveImage(index)}
                        className="absolute -right-1.5 -top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/65"
                      >
                        <UniX size={15} className="text-white" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {images.length > 0 && canAddMoreImages && <CatalystDivider className="ml-5 w-auto" />}
              {canAddMoreImages && (
                <View className="px-5 py-3">
                  <CatalystButton tone="secondary" onPress={handlePickImages}>
                    <CatalystButtonIcon>
                      <UniImageIcon />
                    </CatalystButtonIcon>
                    <CatalystButtonText>
                      画像を追加 ({images.length}/{MAX_IMAGE_COUNT})
                    </CatalystButtonText>
                  </CatalystButton>
                </View>
              )}
            </View>
            {images.length > 0 && (
              <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
                最大10枚まで選択できます
              </CatalystText>
            )}
          </View>

          {/* キャプションセクション */}
          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              キャプション
            </CatalystText>
            <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
              <CatalystTextField
                value={text}
                onChangeText={setText}
                multiline
                placeholder="本文を入力..."
                className="min-h-24"
              />
            </View>
            <View className="flex-row items-start justify-between gap-4 px-5 pt-2">
              <CatalystText variant="caption" tone="subtle" className="flex-1 leading-4">
              {images.length === 0
                ? "画像がない場合は本文が必須です"
                : "画像に添えるキャプションを入力できます（任意）"}
              </CatalystText>
              <CatalystText variant="caption" tone={isOverLimit ? "danger" : "subtle"}>
                {characterCount} / {MAX_CHARACTER_COUNT}
              </CatalystText>
            </View>
          </View>

          {/* 閲覧設定セクション */}
          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              閲覧設定
            </CatalystText>
            <View className="bg-light-background dark:bg-dark-surface">
              <View className="min-h-16 flex-row items-center px-5 py-3">
                <View className="mr-4 flex-1">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    NSFW コンテンツとしてマークする
                  </CatalystText>
                  <CatalystText variant="caption" tone="muted">
                    センシティブなコンテンツとして扱います
                  </CatalystText>
                </View>
                <CatalystSwitch value={isNsfw} onValueChange={setIsNsfw} />
              </View>
              <CatalystDivider className="ml-5 w-auto" />
              <View className="min-h-16 flex-row items-center px-5 py-3">
                <View className="mr-4 flex-1">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    スポイラーを有効にする
                  </CatalystText>
                  <CatalystText variant="caption" tone="muted">
                    ネタバレなどを伏せて表示します
                  </CatalystText>
                </View>
                <CatalystSwitch value={isSpoiler} onValueChange={setIsSpoiler} />
              </View>
            </View>
          </View>

          {/* コンテストセクション */}
          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              コンテスト
            </CatalystText>
            {selectedContest ? (
              <View className="flex-row items-center gap-3 bg-light-background px-5 py-3 dark:bg-dark-surface">
                <UniTrophy size={18} className="text-light-toggle-icon dark:text-dark-toggle-icon" />
                <View className="flex-1">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold" numberOfLines={1}>
                    {selectedContest.title}
                  </CatalystText>
                  {selectedContest.theme ? (
                    <CatalystText variant="caption" tone="muted" numberOfLines={1}>
                      テーマ: {selectedContest.theme}
                    </CatalystText>
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
              <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
                <CatalystButton tone="secondary" onPress={() => contestSelectorRef.current?.open()}>
                  <CatalystButtonIcon>
                    <UniTrophy />
                  </CatalystButtonIcon>
                  <CatalystButtonText>
                  コンテストに参加する
                  </CatalystButtonText>
                </CatalystButton>
              </View>
            )}
            <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
              コンテストに参加すると、この投稿がコンテストの応募作品として登録されます。
            </CatalystText>
          </View>

          {/* プライバシーセクション */}
          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              プライバシー
            </CatalystText>
            <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
              <CatalystSegmentedControl options={PRIVACY_OPTIONS} value={privacy} onValueChange={setPrivacy} />
            </View>
            <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
              {selectedPrivacy.description}
            </CatalystText>
            <View className="mt-3 min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
              <View className="mr-4 flex-1">
                <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                  メタデータを非表示
                </CatalystText>
                <CatalystText variant="caption" tone="muted">
                  画像に埋め込まれたメタデータを表示しません
                </CatalystText>
              </View>
              <CatalystSwitch value={isPrivateMetadata} onValueChange={setIsPrivateMetadata} />
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
