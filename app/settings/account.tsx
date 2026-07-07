import {
  CatalystDivider,
  CatalystListItem,
  CatalystListItemContent,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import * as Credential from "@/models/credential";
import { router } from "expo-router";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, TextInput, View } from "react-native";

export default function AccountSettingsPage() {
  const [account, setAccount] = useAtom(accountAtom);
  const [screenName, setScreenName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = account?.user;
  const isLoggedIn = !!account;
  const canEditScreenName = user ? user.screenName === user.id : false;
  const currentScreenName = screenName ?? user?.screenName ?? "";
  const trimmed = currentScreenName.trim();
  const isSaveDisabled = !user || !canEditScreenName || trimmed === "" || trimmed === user.screenName || isSaving;

  const save = useCallback(async () => {
    if (!account || !user || isSaveDisabled) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await account.credential.client.egeria.update({
        screenName: trimmed,
        displayName: user.displayName,
        profile: user.profile ?? undefined,
      });

      const me = await account.credential.client.egeria.me();
      if (me?.user) {
        setAccount({ ...account, user: me.user });
        setScreenName(me.user.screenName);
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
      setScreenName(null);
    }
  }, [setAccount]);

  if (!isLoggedIn) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <View className="bg-light-background dark:bg-dark-surface">
          <CatalystListItem divided={false} className="min-h-14 px-5 py-3.5" onPress={handleLogin}>
            <CatalystListItemContent className="gap-0">
              <CatalystText variant="subtitle" tone="tint" className="text-[15px] font-semibold">
                ログイン
              </CatalystText>
            </CatalystListItemContent>
          </CatalystListItem>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          ユーザー名
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-14 flex-row items-center px-5 py-3">
            <CatalystText tone="subtle" className="mr-2 text-base">
              @
            </CatalystText>
            <TextInput
              className="flex-1 text-base text-light-text dark:text-dark-text"
              value={currentScreenName}
              onChangeText={setScreenName}
              autoCapitalize="none"
              autoCorrect={false}
              editable={canEditScreenName}
              placeholder="ユーザー名"
              cursorColorClassName="accent-light-tint dark:accent-dark-tint"
              placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
              selectionColorClassName="accent-light-tint dark:accent-dark-tint"
              selectionHandleColorClassName="accent-light-tint dark:accent-dark-tint"
              underlineColorAndroidClassName="accent-transparent"
            />
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <CatalystListItem
            divided={false}
            className="min-h-14 px-5 py-3.5 disabled:opacity-50"
            onPress={save}
            disabled={isSaveDisabled}
          >
            {isSaving ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <CatalystText variant="subtitle" tone="tint" className="text-[15px] font-semibold">
                  保存中...
                </CatalystText>
              </View>
            ) : (
              <CatalystText
                variant="subtitle"
                tone={isSaveDisabled ? "subtle" : "tint"}
                className="text-[15px] font-semibold"
              >
                変更を保存
              </CatalystText>
            )}
          </CatalystListItem>
        </View>
        {footerText && (
          <CatalystText
            variant="caption"
            tone={errorMessage ? "danger" : "subtle"}
            className="px-5 pt-2 leading-4"
          >
            {footerText}
          </CatalystText>
        )}
      </View>

      <View className="mt-6 bg-light-background dark:bg-dark-surface">
        <CatalystListItem divided={false} className="min-h-14 px-5 py-3.5" onPress={handleLogout}>
          <CatalystListItemContent className="gap-0">
            <CatalystText variant="subtitle" tone="danger" className="text-[15px] font-semibold">
              ログアウト
            </CatalystText>
          </CatalystListItemContent>
        </CatalystListItem>
      </View>

      <View className="mt-6 bg-light-background dark:bg-dark-surface">
        <CatalystListItem divided={false} className="min-h-14 px-5 py-3.5" onPress={handleDeleteAccount}>
          <CatalystListItemContent className="gap-0">
            <CatalystText variant="subtitle" tone="danger" className="text-[15px] font-semibold">
              アカウント削除
            </CatalystText>
          </CatalystListItemContent>
        </CatalystListItem>
      </View>
    </View>
  );
}
