import { accountAtom } from "@/models/atoms/account";
import * as Credential from "@/models/credential";
import { router } from "expo-router";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from "react-native";

export default function AccountSettingsPage() {
  const [account, setAccount] = useAtom(accountAtom);
  const [screenName, setScreenName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = account?.user;
  const isLoggedIn = !!account;
  const canEditScreenName = user ? user.screenName === user.id : false;

  useEffect(() => {
    if (screenName === "" && user) {
      setScreenName(user.screenName);
    }
  }, [user, screenName]);

  const trimmed = screenName.trim();
  const isSaveDisabled = !user || !canEditScreenName || trimmed === "" || trimmed === user.screenName || isSaving;

  const save = useCallback(async () => {
    if (!account || !user || isSaveDisabled) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await account.credential.client.egeria.v1.me.patch({
        body: {
          screenName: trimmed,
          displayName: user.displayName,
          profile: user.profile ?? undefined,
        },
        throwOnError: true,
      });

      const { data: me } = await account.credential.client.egeria.v1.me.get({ throwOnError: true });
      if (me?.user) {
        setAccount({ ...account, user: me.user });
      }
    } catch {
      setErrorMessage("ユーザー名の更新に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }, [account, user, trimmed, isSaveDisabled, setAccount]);

  const handleLogout = useCallback(() => {
    Alert.alert("ログアウトしますか？", undefined, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          await Credential.logout();
          setAccount(null);
          router.dismissAll();
        },
      },
    ]);
  }, [setAccount]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert("アカウントを削除しますか？", "この操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            if (account) {
              const token = account.credential.client.accessToken;
              const res = await fetch(`https://api.natsuneko.com/egeria/v1/me`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (res.ok) {
                Alert.alert(
                  "アカウントの削除を開始しました。投稿したデータが完全に消えるまで最大24時間かかることがあります",
                );
                await Credential.logout();
                setAccount(null);
                router.dismissAll();
              }
            }
          } catch {
            // ignored
          }
        },
      },
    ]);
  }, [account, setAccount]);

  const footerText = !canEditScreenName ? "すでに1度ユーザー名を変更しているため、変更できません。" : errorMessage;

  const handleLogin = useCallback(async () => {
    const { credential, isLoggedIn: loggedIn, user } = await Credential.login();
    if (loggedIn && user) {
      setAccount({ user, credential });
    }
  }, [setAccount]);

  if (!isLoggedIn) {
    return (
      <View className="flex-1">
        <View className="mt-4 mx-4 rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          <Pressable className="px-4 py-3.5" onPress={handleLogin}>
            <Text className="text-base text-light-tint dark:text-dark-tint">ログイン</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="mt-4 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">ユーザー名</Text>
        <View className="rounded-xl bg-light-background dark:bg-dark-surface overflow-hidden">
          <View className="px-4 py-3 flex-row items-center border-b border-light-border dark:border-dark-border">
            <Text className="text-base text-light-gray dark:text-dark-gray mr-2">@</Text>
            <TextInput
              className="flex-1 text-base text-light-text dark:text-dark-text"
              value={screenName}
              onChangeText={setScreenName}
              autoCapitalize="none"
              autoCorrect={false}
              editable={canEditScreenName}
              placeholder="ユーザー名"
              style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
            />
          </View>
          <Pressable className="px-4 py-3.5" onPress={save} disabled={isSaveDisabled}>
            {isSaving ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <Text className="text-base text-light-tint dark:text-dark-tint">保存中...</Text>
              </View>
            ) : (
              <Text
                className={
                  isSaveDisabled
                    ? "text-base text-light-gray dark:text-dark-gray"
                    : "text-base text-light-tint dark:text-dark-tint"
                }
              >
                変更を保存
              </Text>
            )}
          </Pressable>
        </View>
        {footerText && (
          <Text
            className={`px-4 pt-1.5 text-xs ${errorMessage ? "text-red-500" : "text-light-gray dark:text-dark-gray"}`}
          >
            {footerText}
          </Text>
        )}
      </View>

      <View className="mt-6 mx-4">
        <View className="rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
          <Pressable className="px-4 py-3.5" onPress={handleLogout}>
            <Text className="text-base text-light-error dark:text-dark-error">ログアウト</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-6 mx-4">
        <View className="rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
          <Pressable className="px-4 py-3.5" onPress={handleDeleteAccount}>
            <Text className="text-base text-light-error dark:text-dark-error">アカウント削除</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
