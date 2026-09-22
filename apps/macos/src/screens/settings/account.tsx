import { accountAtom } from "@/atoms/account";
import {
  confirm,
  SettingsAction,
  SettingsGroup,
  SettingsPage,
  type SettingsPageProps,
} from "@/components/settings-ui";
import { Avatar } from "@/components/ui";
import { login, logout } from "@/models/auth";
import { useAtom } from "jotai";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";

export const AccountPage = ({ onBack }: SettingsPageProps) => {
  const [account, setAccount] = useAtom(accountAtom);
  const [screenName, setScreenName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const user = account?.user;
  const canEditScreenName = user ? user.screenName === user.id : false;
  const currentScreenName = screenName ?? user?.screenName ?? "";
  const trimmed = currentScreenName.trim();
  const isSaveDisabled = !user || !canEditScreenName || trimmed === "" || trimmed === user.screenName || isSaving;

  const save = async () => {
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
        setScreenName(null);
      }
    } catch {
      setErrorMessage("ユーザー名の更新に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const signedIn = await login();
      if (!signedIn) Alert.alert("ログインできませんでした", "時間をおいて再度お試しください。");
    } catch (error) {
      console.error(error);
      Alert.alert("ログインできませんでした", "時間をおいて再度お試しください。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const accepted = await confirm("ログアウトしますか？", undefined, "ログアウト", true);
    if (!accepted) return;
    await logout();
  };

  const handleDeleteAccount = async () => {
    const accepted = await confirm("アカウントを削除しますか？", "この操作は取り消せません。", "削除", true);
    if (!accepted || !account) return;
    try {
      const res = await fetch("https://api.natsuneko.com/egeria/v1/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${account.credential.client.accessToken}` },
      });
      if (!res.ok) {
        Alert.alert("アカウントを削除できませんでした", "時間をおいて再度お試しください。");
        return;
      }
      Alert.alert("アカウントの削除を開始しました", "投稿したデータが完全に消えるまで最大24時間かかることがあります。");
      await logout();
    } catch {
      Alert.alert("アカウントを削除できませんでした", "時間をおいて再度お試しください。");
    }
  };

  if (!user) {
    return (
      <SettingsPage title="アカウント" onBack={onBack}>
        <SettingsGroup footer="ログインするとプロフィールを変更できます。">
          <SettingsAction label="ログイン" busy={isLoggingIn} busyLabel="ログインしています" onPress={handleLogin} />
        </SettingsGroup>
      </SettingsPage>
    );
  }

  const footer = errorMessage ?? (canEditScreenName ? undefined : "すでに1度ユーザー名を変更しているため、変更できません。");

  return (
    <SettingsPage title="アカウント" onBack={onBack}>
      <SettingsGroup>
        <View className="flex-row items-center gap-3 px-4 py-3">
          <Avatar name={user.displayName} size="md" />
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[15px] font-semibold text-light-text dark:text-dark-text">
              {user.displayName}
            </Text>
            <Text numberOfLines={1} className="text-xs text-light-text-muted dark:text-dark-text-muted">
              @{user.screenName}
            </Text>
          </View>
        </View>
      </SettingsGroup>

      <SettingsGroup title="ユーザー名" footer={footer} footerTone={errorMessage ? "danger" : "subtle"}>
        <View className="min-h-11 flex-row items-center px-4 py-2">
          <Text className="mr-1 text-[13px] text-light-text-subtle dark:text-dark-text-subtle">@</Text>
          <TextInput
            value={currentScreenName}
            onChangeText={setScreenName}
            autoCapitalize="none"
            autoCorrect={false}
            editable={canEditScreenName}
            placeholder="ユーザー名"
            placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
            className="flex-1 text-[13px] text-light-text dark:text-dark-text"
          />
        </View>
        <SettingsAction label="変更を保存" disabled={isSaveDisabled} busy={isSaving} onPress={save} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsAction label="ログアウト" tone="danger" onPress={handleLogout} />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsAction label="アカウントを削除" tone="danger" onPress={handleDeleteAccount} />
      </SettingsGroup>
    </SettingsPage>
  );
};
