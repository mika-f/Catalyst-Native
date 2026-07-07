import { conditionToHashtag, SmartAlbumForm, type SmartAlbumCondition } from "@/components/smart-album/form";
import { accountAtom } from "@/models/atoms/account";
import type { CatalystAlbumDisplayMode } from "@/models/sdk-types";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function SmartAlbumComposerScreen() {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreate = useMemo(() => {
    return title.trim().length > 0 && conditions.length > 0 && !isSubmitting;
  }, [title, conditions, isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!canCreate || !account) return;

    setIsSubmitting(true);

    try {
      const client = account.credential.client;
      const { data: result } = await client.catalyst.v1.smartAlbum.create({
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

      Toast.show({ type: "success", text1: "スマートアルバムを作成しました" });
      router.replace(`/smart-album/${result.id}`);
    } catch (error) {
      console.error("Failed to create smart album:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "スマートアルバムの作成に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [canCreate, account, title, description, conditions, since, until, isAllowNsfw, isAllowOthers, isPublic, displayMode, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "スマートアルバム作成",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canCreate}>
              <Text
                className={`text-base font-semibold ${canCreate ? "text-light-accent dark:text-dark-accent" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
              >
                作成
              </Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-background dark:bg-dark-background" style={{ paddingBottom: insets.bottom}}>
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
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
        />
      </View>
    </>
  );
}
