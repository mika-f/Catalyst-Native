import { AlbumForm } from "@/components/album/form";
import { CatalystText } from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Toast from "react-native-toast-message";

export default function AlbumComposerScreen() {
  const router = useRouter();
  const account = useAtomValue(accountAtom);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayMode, setDisplayMode] = useState<CatalystAlbumDisplayMode>("timeline");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = useMemo(() => {
    return title.trim().length > 0 && !isSubmitting;
  }, [title, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!canCreate || !account) return;

    setIsSubmitting(true);

    try {
      const client = account.credential.client;
      await client.catalyst.v1.album.create({
        body: {
          title: title.trim(),
          description: description.trim(),
          isPublic,
          mode: displayMode,
        },
        throwOnError: true,
      });

      Toast.show({ type: "success", text1: "アルバムを作成しました" });
      router.back();
    } catch (error) {
      console.error("Failed to create album:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "アルバムの作成に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [canCreate, account, title, description, isPublic, displayMode, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "アルバム作成",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canCreate}>
              <CatalystText variant="subtitle" tone={canCreate ? "accent" : "subtle"}>
                作成
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
        <AlbumForm
          title={title}
          onChangeTitle={setTitle}
          description={description}
          onChangeDescription={setDescription}
          displayMode={displayMode}
          onChangeDisplayMode={setDisplayMode}
          isPublic={isPublic}
          onChangeIsPublic={setIsPublic}
        />
      </View>
    </>
  );
}
