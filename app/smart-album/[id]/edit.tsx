import {
  conditionToHashtag,
  hashtagsToConditions,
  SmartAlbumForm,
  type SmartAlbumCondition,
} from "@/components/smart-album/form";
import {
  CatalystButton,
  CatalystButtonText,
  CatalystDivider,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function SmartAlbumEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState<SmartAlbumCondition[]>([]);
  const [since, setSince] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);
  const [isAllowNsfw, setIsAllowNsfw] = useState(false);
  const [isAllowOthers, setIsAllowOthers] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [displayMode, setDisplayMode] = useState<CatalystAlbumDisplayMode>("timeline");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!account?.credential.client || !id) return;

    const fetchAlbum = async () => {
      try {
        const { data: album } = await account.credential.client.catalyst.v1.smartAlbum.by.id.id.get({
          path: { id },
          throwOnError: true,
        });
        setTitle(album.name);
        setDescription(album.description);
        setConditions(hashtagsToConditions(album.hashtags));
        setSince(album.since ?? null);
        setUntil(album.until ?? null);
        setIsAllowNsfw(album.isAllowNsfw);
        setIsAllowOthers(album.isAllowOthers);
        setIsPublic(album.isPublic);
        setDisplayMode(album.mode);
      } catch (error) {
        console.error("Failed to fetch smart album:", error);
        Toast.show({ type: "error", text1: "エラー", text2: "スマートアルバム情報の取得に失敗しました" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [id, account]);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && conditions.length > 0 && !isSubmitting;
  }, [title, conditions, isSubmitting]);

  const handleSave = useCallback(async () => {
    if (!canSave || !account) return;

    setIsSubmitting(true);

    try {
      await account.credential.client.catalyst.v1.smartAlbum.by.id.id.patch({
        path: { id },
        body: {
          title: title.trim(),
          description: description.trim(),
          hashtags: conditions.map(conditionToHashtag),
          since: since ?? undefined,
          until: until ?? undefined,
          isAllowNsfw,
          isAllowOthers,
          isPublic,
          mode: displayMode,
        },
        throwOnError: true,
      });

      Toast.show({ type: "success", text1: "スマートアルバムを更新しました" });
      router.back();
    } catch (error) {
      console.error("Failed to edit smart album:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "スマートアルバムの更新に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSave,
    account,
    id,
    title,
    description,
    conditions,
    since,
    until,
    isAllowNsfw,
    isAllowOthers,
    isPublic,
    displayMode,
    router,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert("スマートアルバムを削除", "このスマートアルバムを削除しますか？この操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          if (!account) return;

          setIsSubmitting(true);

          try {
            await account.credential.client.catalyst.v1.smartAlbum.by.id.id.delete({
              path: { id },
              throwOnError: true,
            });
            Toast.show({ type: "success", text1: "スマートアルバムを削除しました" });
            router.dismiss(2);
          } catch (error) {
            console.error("Failed to delete smart album:", error);
            Toast.show({ type: "error", text1: "エラー", text2: "スマートアルバムの削除に失敗しました" });
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  }, [account, id, router]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "スマートアルバム編集" }} />
        <View className="flex-1 items-center justify-center bg-light-background dark:bg-dark-background">
          <ActivityIndicator size="large" colorClassName="accent-light-tint dark:accent-dark-tint" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave} hitSlop={8} className="px-1 py-2">
              <CatalystText
                variant="subtitle"
                tone={canSave ? "tint" : "subtle"}
                className={!canSave ? "opacity-60" : undefined}
              >
                保存
              </CatalystText>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background" style={{ paddingBottom: insets.bottom }}>
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" colorClassName="accent-light-tint dark:accent-dark-tint" />
          </View>
        )}
        <SmartAlbumForm
          title={title}
          onChangeTitle={setTitle}
          description={description}
          onChangeDescription={setDescription}
          conditions={conditions}
          onChangeConditions={setConditions}
          since={since}
          onChangeSince={setSince}
          until={until}
          onChangeUntil={setUntil}
          isAllowNsfw={isAllowNsfw}
          onChangeIsAllowNsfw={setIsAllowNsfw}
          isAllowOthers={isAllowOthers}
          onChangeIsAllowOthers={setIsAllowOthers}
          isPublic={isPublic}
          onChangeIsPublic={setIsPublic}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          footer={
            <>
              <View className="mt-6">
                <CatalystDivider />
                <View className="bg-light-background px-5 py-4 dark:bg-dark-surface">
                  <CatalystButton tone="danger" onPress={handleDelete}>
                    <CatalystButtonText>
                      スマートアルバムを削除
                    </CatalystButtonText>
                  </CatalystButton>
                </View>
              </View>
            </>
          }
        />
      </View>
    </>
  );
}
