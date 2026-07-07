import { accountAtom } from "@/models/atoms/account";
import type {
  CatalystCustomReactionList,
  CatalystUserCustomReaction,
} from "@/models/sdk-types";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

const FILE_SIZE_LIMIT = 1024 * 1024; // 1MB

const PLAN_LABELS: Record<string, string> = {
  none: "—",
  tier_0: "Tier 0",
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
  tier_4: "Tier 4",
  tier_5: "Tier 5",
};

type SelectedImage = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export default function CustomReactionsSettingsPage() {
  const account = useAtomValue(accountAtom);
  const [reactionList, setReactionList] =
    useState<CatalystCustomReactionList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // フォーム状態
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [shortcode, setShortcode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!account) {
      setIsLoading(false);
      return;
    }
    account.credential.client.catalyst.v1.customReactions
      .get({ throwOnError: true })
      .then(({ data }) => setReactionList(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [account]);

  const resetForm = useCallback(() => {
    setSelectedImage(null);
    setShortcode("");
    setDisplayName("");
  }, []);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > FILE_SIZE_LIMIT) {
        Alert.alert("エラー", "画像サイズは1MB以下にしてください");
        return;
      }

      setSelectedImage({
        uri: asset.uri,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileName: asset.fileName ?? "reaction.jpg",
      });
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (
      !account ||
      !selectedImage ||
      !shortcode.trim() ||
      !displayName.trim()
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: created } = await account.credential.client.catalyst.v1.customReactions.create({
        body: {
          image: {
            uri: selectedImage.uri,
            name: selectedImage.fileName,
            type: selectedImage.mimeType,
          } as unknown as Blob,
          shortcode: shortcode.trim(),
          displayName: displayName.trim(),
          visibility: "public",
        },
        throwOnError: true,
      });
      setReactionList((prev) =>
        prev
          ? { ...prev, used: prev.used + 1, items: [...prev.items, created] }
          : prev,
      );
      setShowAddModal(false);
      resetForm();
    } catch {
      Alert.alert("エラー", "リアクションの追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [account, selectedImage, shortcode, displayName, resetForm]);

  const handleDelete = useCallback(
    (item: CatalystUserCustomReaction) => {
      Alert.alert(
        "リアクションを削除しますか？",
        `「${item.displayName}」を削除します。この操作は取り消せません。`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              try {
                await account?.credential.client.catalyst.v1.customReactions.id.delete({
                  path: { id: item.id },
                  throwOnError: true,
                });
                setReactionList((prev) =>
                  prev
                    ? {
                        ...prev,
                        used: prev.used - 1,
                        items: prev.items.filter((r) => r.id !== item.id),
                      }
                    : prev,
                );
              } catch {
                Alert.alert("エラー", "リアクションの削除に失敗しました");
              }
            },
          },
        ],
      );
    },
    [account],
  );

  const canAdd =
    reactionList != null &&
    reactionList.limit > 0 &&
    reactionList.used < reactionList.limit;

  const isAddDisabled =
    isSubmitting ||
    !selectedImage ||
    !shortcode.trim() ||
    !displayName.trim();

  if (!account) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-light-text-muted dark:text-dark-text-muted">
          ログインが必要です
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1">
        {/* プラン情報 */}
        <View className="mt-4 mx-4">
          <View className="rounded-xl bg-light-surface dark:bg-dark-surface px-4 py-3 gap-1">
            <View className="flex-row justify-between">
              <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
                プラン
              </Text>
              <Text className="text-sm text-light-text dark:text-dark-text font-medium">
                {PLAN_LABELS[reactionList?.plan ?? "none"]}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
                使用数
              </Text>
              <Text className="text-sm text-light-text dark:text-dark-text font-medium">
                {reactionList?.used ?? 0} / {reactionList?.limit ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* プランなしメッセージ */}
        {(reactionList?.limit ?? 0) === 0 && (
          <View className="mx-4 mt-3">
            <Text className="text-sm text-light-text-muted dark:text-dark-text-muted bg-light-surface dark:bg-dark-surface px-4 py-3 rounded-xl">
              サポーター登録をするとカスタムリアクションを利用できます。
            </Text>
          </View>
        )}

        {/* 追加ボタン */}
        {(reactionList?.limit ?? 0) > 0 && (
          <View className="mx-4 mt-3">
            <Pressable
              className={`rounded-xl px-4 py-3 items-center ${
                canAdd
                  ? "bg-light-tint dark:bg-dark-tint"
                  : "bg-light-surface-muted dark:bg-dark-surface-muted"
              }`}
              onPress={() => setShowAddModal(true)}
              disabled={!canAdd}
            >
              <Text
                className={`text-base font-medium ${
                  canAdd
                    ? "text-light-tint-foreground dark:text-dark-tint-foreground"
                    : "text-light-gray dark:text-dark-gray"
                }`}
              >
                リアクションを追加
              </Text>
            </Pressable>
          </View>
        )}

        {/* リアクション一覧 */}
        {(reactionList?.items.length ?? 0) > 0 && (
          <View className="mt-4 mx-4">
            <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
              登録済みリアクション
            </Text>
            <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
              {reactionList?.items.map((item, index) => (
                <View
                  key={item.id}
                  className={`px-4 py-3 flex-row items-center ${
                    index < (reactionList.items.length - 1)
                      ? "border-b border-light-border dark:border-dark-border"
                      : ""
                  }`}
                >
                  <UniImage
                    source={{ uri: item.imageUrl }}
                    className="w-8 h-8 mr-3"
                    contentFit="contain"
                  />
                  <View className="flex-1">
                    <Text className="text-base text-light-text dark:text-dark-text">
                      {item.displayName}
                    </Text>
                    <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                      :{item.shortcode}:
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDelete(item)}
                    hitSlop={8}
                  >
                    <Text className="text-light-error dark:text-dark-error text-sm">
                      削除
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 空の状態 */}
        {(reactionList?.items.length ?? 0) === 0 &&
          (reactionList?.limit ?? 0) > 0 && (
            <View className="mx-4 mt-4">
              <Text className="text-sm text-light-text-muted dark:text-dark-text-muted text-center py-8">
                カスタムリアクションがまだありません
              </Text>
            </View>
          )}
      </ScrollView>

      {/* 追加モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View className="flex-1 bg-light-background dark:bg-dark-background">
          {/* ナビゲーションバー */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-light-border dark:border-dark-border">
            <Pressable
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <Text className="text-base text-light-tint dark:text-dark-tint">
                キャンセル
              </Text>
            </Pressable>
            <Text className="text-base font-semibold text-light-text dark:text-dark-text">
              リアクションを追加
            </Text>
            <Pressable onPress={handleAdd} disabled={isAddDisabled}>
              {isSubmitting ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  className={`text-base font-medium ${
                    isAddDisabled
                      ? "text-light-gray dark:text-dark-gray"
                      : "text-light-tint dark:text-dark-tint"
                  }`}
                >
                  追加
                </Text>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-4">
            {/* 画像選択 */}
            <View className="mx-4">
              <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
                画像
              </Text>
              <Pressable
                onPress={handlePickImage}
                className="rounded-xl bg-light-surface dark:bg-dark-surface px-4 py-3 flex-row items-center gap-3"
              >
                {selectedImage ? (
                  <>
                    <UniImage
                      source={{ uri: selectedImage.uri }}
                      className="w-10 h-10"
                      contentFit="contain"
                    />
                    <Text className="text-base text-light-tint dark:text-dark-tint">
                      画像を変更
                    </Text>
                  </>
                ) : (
                  <Text className="text-base text-light-tint dark:text-dark-tint">
                    画像を選択（PNG / JPEG、最大 1MB）
                  </Text>
                )}
              </Pressable>
            </View>

            {/* ショートコード */}
            <View className="mx-4 mt-4">
              <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
                ショートコード
              </Text>
              <View className="rounded-xl bg-light-surface dark:bg-dark-surface px-4 py-3">
                <TextInput
                  className="text-base text-light-text dark:text-dark-text"
                  value={shortcode}
                  onChangeText={(text) =>
                    setShortcode(text.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="kawaii"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={
                    Platform.OS === "ios" ? { lineHeight: undefined } : undefined
                  }
                />
              </View>
              <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
                英小文字、数字、アンダースコア、ハイフンのみ使用できます
              </Text>
            </View>

            {/* 表示名 */}
            <View className="mx-4 mt-4">
              <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">
                表示名
              </Text>
              <View className="rounded-xl bg-light-surface dark:bg-dark-surface px-4 py-3">
                <TextInput
                  className="text-base text-light-text dark:text-dark-text"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="かわいい"
                  placeholderTextColor="#8E8E93"
                  maxLength={32}
                  style={
                    Platform.OS === "ios" ? { lineHeight: undefined } : undefined
                  }
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
