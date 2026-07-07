import {
  CatalystButton,
  CatalystButtonText,
  CatalystDivider,
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import type {
  CatalystCustomReactionList,
  CatalystUserCustomReaction,
} from "@natsuneko-laboratory/catalyst-sdk";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
  const [isLoading, setIsLoading] = useState(() => !!account);
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
      return;
    }
    let isActive = true;

    account.credential.client.catalyst
      .getCustomUserReactions()
      .then((list) => {
        if (isActive) {
          setReactionList(list);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
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
      const form = new FormData();
      form.append("image", {
        uri: selectedImage.uri,
        name: selectedImage.fileName,
        type: selectedImage.mimeType,
      } as unknown as Blob);
      form.append("shortcode", shortcode.trim());
      form.append("displayName", displayName.trim());
      form.append("visibility", "public");

      const created = await account.credential.client.catalyst.createCustomReaction(form);
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
                await account?.credential.client.catalyst.deleteCustomReaction(
                  item.id,
                );
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
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <CatalystEmptyState title="ログインが必要です" description="ログインするとカスタムリアクションを管理できます。" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-surface-muted dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-light-surface-muted dark:bg-dark-background" contentContainerClassName="pb-8">
        {/* プラン情報 */}
        <View className="pt-2">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            プラン
          </CatalystText>
          <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
            <View className="flex-row justify-between">
              <CatalystText tone="muted">
                プラン
              </CatalystText>
              <CatalystText variant="label">
                {PLAN_LABELS[reactionList?.plan ?? "none"]}
              </CatalystText>
            </View>
            <View className="mt-2 flex-row justify-between">
              <CatalystText tone="muted">
                使用数
              </CatalystText>
              <CatalystText variant="label">
                {reactionList?.used ?? 0} / {reactionList?.limit ?? 0}
              </CatalystText>
            </View>
          </View>
        </View>

        {/* プランなしメッセージ */}
        {(reactionList?.limit ?? 0) === 0 && (
          <View className="mt-3 bg-light-background px-5 py-3 dark:bg-dark-surface">
            <CatalystText tone="muted">
              サポーター登録をするとカスタムリアクションを利用できます。
            </CatalystText>
          </View>
        )}

        {/* 追加ボタン */}
        {(reactionList?.limit ?? 0) > 0 && (
          <View className="mx-5 mt-4">
            <CatalystButton
              tone={canAdd ? "primary" : "secondary"}
              onPress={() => setShowAddModal(true)}
              disabled={!canAdd}
            >
              <CatalystButtonText>
                リアクションを追加
              </CatalystButtonText>
            </CatalystButton>
          </View>
        )}

        {/* リアクション一覧 */}
        {(reactionList?.items.length ?? 0) > 0 && (
          <View className="mt-6">
            <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
              登録済みリアクション
            </CatalystText>
            <View className="bg-light-background dark:bg-dark-surface">
              {reactionList?.items.map((item, index) => (
                <View key={item.id}>
                  <View className="min-h-16 flex-row items-center px-5 py-3">
                    <UniImage
                      source={{ uri: item.imageUrl }}
                      className="mr-3 h-9 w-9"
                      contentFit="contain"
                    />
                    <CatalystListItemContent>
                      <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                        {item.displayName}
                      </CatalystText>
                      <CatalystText variant="caption" tone="muted">
                        :{item.shortcode}:
                      </CatalystText>
                    </CatalystListItemContent>
                    <Pressable onPress={() => handleDelete(item)} hitSlop={8}>
                      <CatalystText variant="label" tone="danger">
                        削除
                      </CatalystText>
                    </Pressable>
                  </View>
                  {index < reactionList.items.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 空の状態 */}
        {(reactionList?.items.length ?? 0) === 0 &&
          (reactionList?.limit ?? 0) > 0 && (
            <CatalystEmptyState title="カスタムリアクションがまだありません" />
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
        <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
          {/* ナビゲーションバー */}
          <View className="flex-row items-center justify-between border-b border-light-divider bg-light-background px-5 py-3 dark:border-dark-divider dark:bg-dark-surface">
            <Pressable
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <CatalystText variant="label" tone="tint">
                キャンセル
              </CatalystText>
            </Pressable>
            <CatalystText variant="subtitle">
              リアクションを追加
            </CatalystText>
            <Pressable onPress={handleAdd} disabled={isAddDisabled}>
              {isSubmitting ? (
                <ActivityIndicator size="small" />
              ) : (
                <CatalystText variant="label" tone={isAddDisabled ? "subtle" : "tint"}>
                  追加
                </CatalystText>
              )}
            </Pressable>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="py-4">
            {/* 画像選択 */}
            <View>
              <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
                画像
              </CatalystText>
              <CatalystListItem divided={false} className="min-h-16 bg-light-background px-5 py-3 dark:bg-dark-surface" onPress={handlePickImage}>
                {selectedImage ? (
                  <>
                    <UniImage
                      source={{ uri: selectedImage.uri }}
                      className="h-10 w-10"
                      contentFit="contain"
                    />
                    <CatalystText variant="subtitle" tone="tint" className="text-[15px] font-semibold">
                      画像を変更
                    </CatalystText>
                  </>
                ) : (
                  <CatalystText variant="subtitle" tone="tint" className="text-[15px] font-semibold">
                    画像を選択（PNG / JPEG、最大 1MB）
                  </CatalystText>
                )}
              </CatalystListItem>
            </View>

            {/* ショートコード */}
            <View className="mt-6">
              <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
                ショートコード
              </CatalystText>
              <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
                <TextInput
                  className="text-base text-light-text dark:text-dark-text"
                  value={shortcode}
                  onChangeText={(text) =>
                    setShortcode(text.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="kawaii"
                  placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
                  cursorColorClassName="accent-light-tint dark:accent-dark-tint"
                  selectionColorClassName="accent-light-tint dark:accent-dark-tint"
                  selectionHandleColorClassName="accent-light-tint dark:accent-dark-tint"
                  underlineColorAndroidClassName="accent-transparent"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
                英小文字、数字、アンダースコア、ハイフンのみ使用できます
              </CatalystText>
            </View>

            {/* 表示名 */}
            <View className="mt-6">
              <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
                表示名
              </CatalystText>
              <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
                <TextInput
                  className="text-base text-light-text dark:text-dark-text"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="かわいい"
                  placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
                  cursorColorClassName="accent-light-tint dark:accent-dark-tint"
                  selectionColorClassName="accent-light-tint dark:accent-dark-tint"
                  selectionHandleColorClassName="accent-light-tint dark:accent-dark-tint"
                  underlineColorAndroidClassName="accent-transparent"
                  maxLength={32}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
