import { EmojiPickerSheet, type EmojiPickerSheetRef } from "@/components/emoji-verse";
import type { EmojiItem } from "@/components/emoji-verse/types";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type {
  EgeriaUser,
  EgeriaUserProfile,
  ProfileEmoji as ProfileEmojiType,
  ProfileEmojiRequest,
  ProfileTag,
  ProfileTagSuggestion,
} from "@/models/sdk-types";
import * as FileSystem from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useAtom, useAtomValue } from "jotai";
import { Camera, Plus, Trash2, X } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import ImageCropPicker, { Image } from "react-native-image-crop-picker";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const PROFILE_TAG_MAX_COUNT = 10;
const PROFILE_TAG_MAX_LENGTH = 30;

const UniImage = withUniwind(ExpoImage);
const UniCamera = withUniwind(Camera);
const UniPlus = withUniwind(Plus);
const UniTrash2 = withUniwind(Trash2);
const UniX = withUniwind(X);

const BANNER_WIDTH = 1500;
const BANNER_CROP_HEIGHT = 500;
const ICON_SIZE = 512;
const MAX_ADDITIONAL_WEBSITES = 4;

function isValidUrl(text: string): boolean {
  if (!text.trim()) return true;
  try {
    const url = new URL(text);
    return (url.protocol === "http:" || url.protocol === "https:") && !!url.host;
  } catch {
    return false;
  }
}

export default function ProfileEditScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const bannerHeight = screenWidth / 3;
  const theme = useColorScheme() ?? "light";
  const router = useRouter();
  const [account, setAccount] = useAtom(accountAtom);
  const client = useAtomValue(clientAtom);
  const user = account?.user as EgeriaUser | undefined;

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileEmoji, setProfileEmoji] = useState<ProfileEmojiType | null>(user?.profileEmoji ?? null);
  const [profileEmojiRequest, setProfileEmojiRequest] = useState<ProfileEmojiRequest | null | undefined>(undefined);
  const [bio, setBio] = useState(user?.profile?.bio ?? "");
  const [website, setWebsite] = useState(user?.profile?.website ?? "");
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(
    user?.profile?.additionalWebsites?.filter((w) => !!w.trim()) ?? [],
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [tags, setTags] = useState<ProfileTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestions, setSuggestions] = useState<ProfileTagSuggestion[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef<string>("");
  const profileEmojiPickerRef = useRef<EmojiPickerSheetRef>(null);

  useAsyncEffect(async () => {
    if (!user) return;
    const result = await client.catalyst.v1.profileTags.by.user.id
      .get({ path: { id: user.id }, throwOnError: true })
      .then((r) => r.data.tags)
      .catch(() => []);
    setTags(result);
  }, [user?.id]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!displayName.trim()) errors.push("表示名を入力してください");
    if (!isValidUrl(website)) errors.push("ウェブサイトのURLが無効です");
    for (const w of additionalWebsites) {
      if (!isValidUrl(w)) {
        errors.push("追加ウェブサイトのURLが無効です");
        break;
      }
    }
    return errors;
  }, [displayName, website, additionalWebsites]);

  const canSave = validationErrors.length === 0 && !isSubmitting && !isUploadingImage;

  const uploadImage = useCallback(
    async (img: Image): Promise<string | null> => {
      const file = new FileSystem.File(img.path);
      const ab = await file.arrayBuffer();
      const { data: uploadUrls } = await client.media.v2.upload.create({ throwOnError: true });
      const uploadResponse = await fetch(uploadUrls.signedUrl, {
        method: "PUT",
        body: ab,
        headers: { "Content-Type": img.mime || "image/jpeg" },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      return uploadUrls.url;
    },
    [client],
  );

  const updateProfileImage = useCallback(
    async (field: "iconUrl" | "bannerUrl", img: Image) => {
      if (!account) return;

      setIsUploadingImage(true);
      try {
        const uploaded = await uploadImage(img);
        if (!uploaded) return;

        await client.egeria.v1.me.patch({
          body: {
            displayName: account.user.displayName,
            profile: { [field]: uploaded } as unknown as EgeriaUserProfile,
          },
          throwOnError: true,
        });

        const { data: me } = await client.egeria.v1.me.get({ throwOnError: true });
        if (me?.user) {
          setAccount((w) => ({ ...w!, user: me.user }));
        }
      } catch (error) {
        console.error(`Failed to upload ${field}:`, error);
        Toast.show({
          type: "error",
          text1: "エラー",
          text2: "画像のアップロードに失敗しました",
        });
      } finally {
        setIsUploadingImage(false);
      }
    },
    [account, client, uploadImage, setAccount],
  );

  const handlePickBanner = useCallback(async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: BANNER_WIDTH,
        height: BANNER_CROP_HEIGHT,
        cropping: true,
        cropperToolbarTitle: "ヘッダー画像を切り取り",
        mediaType: "photo",
        maxFiles: 1,
      });
      await updateProfileImage("bannerUrl", image);
    } catch (e: any) {
      if (e?.code !== "E_PICKER_CANCELLED") {
        console.error("Banner pick error:", e);
      }
    }
  }, [updateProfileImage]);

  const handlePickIcon = useCallback(async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: ICON_SIZE,
        height: ICON_SIZE,
        cropping: true,
        cropperCircleOverlay: true,
        cropperToolbarTitle: "アイコン画像を切り取り",
        mediaType: "photo",
        maxFiles: 1,
      });
      await updateProfileImage("iconUrl", image);
    } catch (e: any) {
      if (e?.code !== "E_PICKER_CANCELLED") {
        console.error("Icon pick error:", e);
      }
    }
  }, [updateProfileImage]);

  const handleAddWebsite = useCallback(() => {
    if (additionalWebsites.length < MAX_ADDITIONAL_WEBSITES) {
      setAdditionalWebsites((prev) => [...prev, ""]);
    }
  }, [additionalWebsites.length]);

  const handleRemoveWebsite = useCallback((index: number) => {
    setAdditionalWebsites((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateWebsite = useCallback((index: number, value: string) => {
    setAdditionalWebsites((prev) => prev.map((w, i) => (i === index ? value : w)));
  }, []);

  const handleTagInputChange = useCallback((value: string) => {
    setTagInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim().replace(/^[#＃]/, "").trim();
    if (q.length === 0) {
      setSuggestions([]);
      return;
    }
    latestQueryRef.current = q;
    debounceRef.current = setTimeout(async () => {
      if (q !== latestQueryRef.current) return;
      const result = await client.catalyst.v1.profileTags.suggestions
        .get({ query: { q }, throwOnError: true })
        .then((r) => r.data.tags)
        .catch(() => []);
      if (q !== latestQueryRef.current) return;
      setSuggestions(result);
    }, 300);
  }, [client]);

  const handleAddTag = useCallback((name: string) => {
    const trimmed = name.trim().replace(/^[#＃]/, "").trim();
    if (!trimmed) return;
    if (tags.length >= PROFILE_TAG_MAX_COUNT) {
      Toast.show({ type: "error", text1: "エラー", text2: `ハッシュタグは最大${PROFILE_TAG_MAX_COUNT}個まで設定できます` });
      return;
    }
    if (trimmed.length > PROFILE_TAG_MAX_LENGTH) {
      Toast.show({ type: "error", text1: "エラー", text2: `ハッシュタグは最大${PROFILE_TAG_MAX_LENGTH}文字までです` });
      return;
    }
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      Toast.show({ type: "error", text1: "エラー", text2: "同じハッシュタグがすでに追加されています" });
      return;
    }
    setTags((prev) => [...prev, { id: `pending-${trimmed}`, name: trimmed, normalizedName: trimmed.toLowerCase() }]);
    setTagInput("");
    setSuggestions([]);
  }, [tags]);

  const handleRemoveTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleProfileEmojiSelected = useCallback((emoji: EmojiItem) => {
    if (emoji.type.kind === "unicode") {
      setProfileEmoji({
        type: "standard",
        value: emoji.type.emoji,
        imageUrl: "",
      });
      setProfileEmojiRequest({ type: "standard", value: emoji.type.emoji });
      return;
    }

    if (!emoji.type.customReactionId) return;

    setProfileEmoji({
      type: "custom",
      id: emoji.type.customReactionId,
      shortcode: emoji.id.replace(/^:/, "").replace(/:$/, ""),
      displayName: emoji.keywords[0] ?? emoji.id,
      imageUrl: emoji.type.url,
      width: 1,
      height: 1,
    });
    setProfileEmojiRequest({ type: "custom", customReactionId: emoji.type.customReactionId });
  }, []);

  const handleClearProfileEmoji = useCallback(() => {
    setProfileEmoji(null);
    setProfileEmojiRequest(null);
  }, []);

  const handleSaveTags = useCallback(async () => {
    setIsSavingTags(true);
    try {
      await client.catalyst.v1.profileTags.update({
        body: { tags: tags.map((t) => t.name) },
        throwOnError: true,
      });
      Toast.show({ type: "success", text1: "保存しました", text2: "ハッシュタグを保存しました" });
    } catch {
      Toast.show({ type: "error", text1: "エラー", text2: "ハッシュタグの保存に失敗しました" });
    } finally {
      setIsSavingTags(false);
    }
  }, [client, tags]);

  const handleSave = useCallback(async () => {
    if (!canSave || !account) return;

    setIsSubmitting(true);

    try {
      const filteredWebsites = additionalWebsites.filter((w) => !!w.trim());

      await client.egeria.v1.me.patch({
        body: {
          displayName: displayName.trim(),
          profile: {
            bio,
            website: website.trim(),
            additionalWebsites: filteredWebsites,
          } as EgeriaUserProfile,
          ...(profileEmojiRequest !== undefined ? { profileEmoji: profileEmojiRequest } : {}),
        },
        throwOnError: true,
      });

      const { data: me } = await client.egeria.v1.me.get({ throwOnError: true });
      if (me?.user) {
        setAccount({ user: me.user, credential: account.credential });
      }

      router.back();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Toast.show({
        type: "error",
        text1: "エラー",
        text2: "プロフィールの更新に失敗しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [canSave, account, displayName, bio, website, additionalWebsites, profileEmojiRequest, client, setAccount, router]);

  const currentBannerUri = user?.profile?.bannerUrl
    ? getCdnUrl({ src: user.profile.bannerUrl, variant: "header", width: screenWidth })
    : null;

  const currentIconUri = user?.profile?.iconUrl
    ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 128 })
    : null;

  if (!user) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "プロフィールを編集",
            headerBackTitle: "キャンセル",
          }}
        />
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "プロフィールを編集",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave}>
              <Text
                className={cn(
                  "text-base font-semibold",
                  canSave
                    ? "text-light-accent dark:text-dark-accent"
                    : "text-light-text-subtle dark:text-dark-text-subtle",
                )}
              >
                保存
              </Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {(isSubmitting || isUploadingImage) && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
          </View>
        )}
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={100}
        >
          <ScrollView className="flex-1" contentContainerClassName="pb-12">
            {/* ヘッダー画像 */}
            <Pressable onPress={handlePickBanner} disabled={isUploadingImage}>
              <View style={{ width: screenWidth, height: bannerHeight }}>
                {currentBannerUri ? (
                  <UniImage
                    source={{ uri: currentBannerUri }}
                    contentFit="cover"
                    style={{ width: screenWidth, height: bannerHeight }}
                  />
                ) : (
                  <View
                    className="bg-neutral-400 dark:bg-neutral-700"
                    style={{ width: screenWidth, height: bannerHeight }}
                  />
                )}
                <View className="absolute inset-0 items-center justify-center bg-black/30">
                  <UniCamera size={28} className="text-white" />
                </View>
              </View>
            </Pressable>

            {/* アイコン画像 */}
            <View className="px-4 -mt-10">
              <Pressable onPress={handlePickIcon} disabled={isUploadingImage}>
                <View className="border-light-background dark:border-dark-background rounded-full border-4 w-24 h-24">
                  {currentIconUri ? (
                    <UniImage
                      source={{ uri: currentIconUri }}
                      className="w-full h-full rounded-full"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-full h-full rounded-full bg-neutral-400 dark:bg-neutral-600" />
                  )}
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                    <UniCamera size={20} className="text-white" />
                  </View>
                </View>
              </Pressable>
              <Text className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">
                正方形にクロップされます
              </Text>
            </View>

            {/* フォーム */}
            <View className="px-4 mt-4 gap-5">
              {/* 表示名 */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">表示名</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="表示名"
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                  style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
                />
                {!displayName.trim() && (
                  <Text className="text-xs text-light-error dark:text-dark-error">表示名は必須です</Text>
                )}
              </View>

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* プロフィール絵文字 */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">プロフィール絵文字</Text>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-light-surface-muted dark:bg-dark-surface-muted">
                      <ProfileEmoji emoji={profileEmoji} size={24} />
                    </View>
                    <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
                      {profileEmoji ? "表示名の横に表示されます" : "未設定"}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    {profileEmoji && (
                      <Pressable
                        onPress={handleClearProfileEmoji}
                        className="rounded-lg border border-light-border dark:border-dark-border px-3 py-2"
                      >
                        <Text className="text-sm font-semibold text-light-text dark:text-dark-text">削除</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => profileEmojiPickerRef.current?.open()}
                      className="rounded-lg bg-light-tint dark:bg-dark-tint px-3 py-2"
                    >
                      <Text className="text-sm font-semibold text-light-tint-foreground dark:text-dark-tint-foreground">
                        選択
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* 自己紹介 */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">自己紹介</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="自己紹介を入力..."
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  multiline
                  className="min-h-20 rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                  textAlignVertical="top"
                />
              </View>

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* ウェブサイト */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-light-text dark:text-dark-text">ウェブサイト</Text>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://example.com"
                  placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                  style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
                />
                {website.trim() && !isValidUrl(website) && (
                  <Text className="text-xs text-light-error dark:text-dark-error">
                    有効なURLを入力してください (http:// または https://)
                  </Text>
                )}
              </View>

              {/* 追加ウェブサイト */}
              {additionalWebsites.map((w, index) => (
                <View key={`additional-website-${index}`} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-light-text dark:text-dark-text">
                      追加ウェブサイト {index + 1}
                    </Text>
                    <Pressable onPress={() => handleRemoveWebsite(index)} hitSlop={8}>
                      <UniTrash2 size={16} className="text-light-error dark:text-dark-error" />
                    </Pressable>
                  </View>
                  <TextInput
                    value={w}
                    onChangeText={(value) => handleUpdateWebsite(index, value)}
                    placeholder="https://example.com"
                    placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    className="rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                    style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
                  />
                  {w.trim() && !isValidUrl(w) && (
                    <Text className="text-xs text-light-error dark:text-dark-error">
                      有効なURLを入力してください (http:// または https://)
                    </Text>
                  )}
                </View>
              ))}

              {additionalWebsites.length < MAX_ADDITIONAL_WEBSITES && (
                <Pressable onPress={handleAddWebsite} className="flex-row items-center gap-2">
                  <UniPlus size={16} className="text-light-tint dark:text-dark-tint" />
                  <Text className="text-sm text-light-tint dark:text-dark-tint">ウェブサイトを追加</Text>
                </Pressable>
              )}
              {additionalWebsites.length > 0 && (
                <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  最大{MAX_ADDITIONAL_WEBSITES}件まで追加できます
                </Text>
              )}

              <View className="h-px bg-light-divider dark:bg-dark-divider" />

              {/* プロフィールハッシュタグ */}
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-light-text dark:text-dark-text">プロフィールハッシュタグ</Text>
                  <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                    {tags.length}/{PROFILE_TAG_MAX_COUNT}
                  </Text>
                </View>
                <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  あなたの活動や好きなものを表すタグを追加してください。
                </Text>

                {/* 追加済みタグ */}
                {tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <View
                        key={tag.id}
                        className="flex-row items-center gap-1 rounded-full bg-light-surface-muted dark:bg-dark-surface-muted px-2.5 py-1"
                      >
                        <Text className="text-xs text-light-tint dark:text-dark-tint">#{tag.name}</Text>
                        <Pressable onPress={() => handleRemoveTag(tag.id)} hitSlop={6}>
                          <UniX size={12} className="text-light-text-muted dark:text-dark-text-muted" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {/* タグ入力 */}
                {tags.length < PROFILE_TAG_MAX_COUNT && (
                  <View className="relative">
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={tagInput}
                        onChangeText={handleTagInputChange}
                        onSubmitEditing={() => handleAddTag(tagInput)}
                        returnKeyType="done"
                        placeholder="タグを入力（# は任意）"
                        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="flex-1 rounded-lg border border-light-border bg-light-surface px-3 py-2.5 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                        style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
                      />
                      <Pressable
                        onPress={() => handleAddTag(tagInput)}
                        disabled={!tagInput.trim()}
                        className="rounded-lg bg-light-tint dark:bg-dark-tint px-3 py-2.5"
                      >
                        <Text className="text-sm font-semibold text-light-tint-foreground dark:text-dark-tint-foreground">追加</Text>
                      </Pressable>
                    </View>

                    {/* サジェスト */}
                    {suggestions.length > 0 && (
                      <View className="mt-1 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface overflow-hidden">
                        {suggestions.map((s) => (
                          <Pressable
                            key={s.id}
                            onPress={() => handleAddTag(s.name)}
                            className="flex-row items-center justify-between px-3 py-2 border-b border-light-divider dark:border-dark-divider last:border-0"
                          >
                            <Text className="text-sm font-medium text-light-text dark:text-dark-text">#{s.name}</Text>
                            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                              {s.usageCount.toLocaleString()} 人
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* タグ保存ボタン */}
                <Pressable
                  onPress={handleSaveTags}
                  disabled={isSavingTags}
                  className="items-center rounded-lg border border-light-border dark:border-dark-border px-4 py-2.5"
                >
                  <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                    {isSavingTags ? "保存中..." : "タグを保存"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <EmojiPickerSheet
        ref={profileEmojiPickerRef}
        onEmojiSelected={handleProfileEmojiSelected}
        includeCatalystReactions={false}
      />
    </>
  );
}
