import { AlbumForm } from "@/components/album/form";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import Toast from "react-native-toast-message";

export default function AlbumEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAtomValue(accountAtom);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayMode, setDisplayMode] = useState<CatalystAlbumDisplayMode>("timeline");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!account?.credential.client || !id) return;

    const fetchAlbum = async () => {
      try {
        const { data: album } = await account.credential.client.catalyst.v1.album.by.id.id.get({
          path: { id },
          throwOnError: true,
        });
        setTitle(album.name);
        setDescription(album.description);
        setDisplayMode(album.mode);
        setIsPublic(album.isPublic);
      } catch (error) {
        console.error("Failed to fetch album:", error);
        Toast.show({ type: "error", text1: "エラー", text2: "アルバム情報の取得に失敗しました" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbum();
  }, [id, account]);

  const canSave = useMemo(() => {
    return title.trim().length > 0 && !isSubmitting;
  }, [title, isSubmitting]);

  const handleSave = useCallback(async () => {
    if (!canSave || !account) return;

    setIsSubmitting(true);

    try {
      await account.credential.client.catalyst.v1.album.by.id.id.patch({
        path: { id },
        body: {
          title: title.trim(),
          description: description.trim(),
          isPublic,
          mode: displayMode,
        },
        throwOnError: true,
      });

      Toast.show({ type: "success", text1: "アルバムを更新しました" });
      router.back();
    } catch (error) {
      console.error("Failed to edit album:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "アルバムの更新に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [canSave, account, id, title, description, isPublic, displayMode, router]);

  const handleDelete = useCallback(() => {
    Alert.alert("アルバムを削除", "このアルバムを削除しますか？この操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          if (!account) return;

          setIsSubmitting(true);

          try {
            await account.credential.client.catalyst.v1.album.by.id.id.delete({
              path: { id },
              throwOnError: true,
            });
            Toast.show({ type: "success", text1: "アルバムを削除しました" });
            router.dismiss(2);
          } catch (error) {
            console.error("Failed to delete album:", error);
            Toast.show({ type: "error", text1: "エラー", text2: "アルバムの削除に失敗しました" });
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
        <Stack.Screen options={{ title: "アルバム編集" }} />
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
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave}>
              <Text
                className={`text-base font-semibold ${canSave ? "text-light-accent dark:text-dark-accent" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
              >
                保存
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
        <AlbumForm
          title={title}
          onChangeTitle={setTitle}
          description={description}
          onChangeDescription={setDescription}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          isPublic={isPublic}
          onChangeIsPublic={setIsPublic}
          footer={
            <>
              <View className="h-px bg-light-divider dark:bg-dark-divider" />
              <View className="gap-3">
                <Pressable
                  onPress={handleDelete}
                  className="items-center rounded-lg border border-light-error bg-light-error-background p-3 dark:border-dark-error dark:bg-dark-error-background"
                >
                  <Text className="text-sm font-semibold text-light-error dark:text-dark-error">アルバムを削除</Text>
                </Pressable>
              </View>
            </>
          }
        />
      </View>
    </>
  );
}
