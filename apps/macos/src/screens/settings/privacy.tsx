import { accountAtom } from "@/atoms/account";
import {
  SettingsGroup,
  SettingsLoading,
  SettingsMessage,
  SettingsPage,
  SettingsSwitch,
  type SettingsPageProps,
} from "@/components/settings-ui";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

const STORAGE_KEY = "catalyst:privacy_settings";

type Visibility = "public" | "private";

type PrivacySettings = {
  followingListVisibility: Visibility;
  followerListVisibility: Visibility;
};

const DEFAULT_SETTINGS: PrivacySettings = {
  followingListVisibility: "private",
  followerListVisibility: "private",
};

const loadCachedSettings = async (): Promise<PrivacySettings> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return JSON.parse(raw) as PrivacySettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const PrivacyPage = ({ onBack }: SettingsPageProps) => {
  const account = useAtomValue(accountAtom);
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(account !== null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) {
      setIsLoading(false);
      return;
    }
    let ignore = false;
    const apply = (value: PrivacySettings) => {
      if (!ignore) setSettings(value);
    };

    account.credential.client.catalyst.v1.privacy.settings
      .get({ throwOnError: true })
      .then(async ({ data }) => {
        apply(data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      })
      .catch(() => loadCachedSettings().then(apply))
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [account]);

  const toggle = async (key: keyof PrivacySettings, isPublic: boolean) => {
    if (!account || saving) return;
    const previous = settings;
    const updated: PrivacySettings = { ...settings, [key]: isPublic ? "public" : "private" };
    setSettings(updated);
    setSaving(true);
    try {
      await account.credential.client.catalyst.v1.privacy.settings.patch({ body: updated, throwOnError: true });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setSettings(previous);
      Alert.alert("設定を保存できませんでした", "時間をおいて再度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <SettingsLoading title="プライバシー" onBack={onBack} />;
  if (!account) {
    return <SettingsMessage title="プライバシー" onBack={onBack} message="ログインするとプライバシー設定を変更できます。" />;
  }

  return (
    <SettingsPage title="プライバシー" onBack={onBack}>
      <SettingsGroup title="フォロー・フォロワー" footer="設定はサーバーに保存されます。">
        <SettingsSwitch
          title="フォロー中の一覧を公開"
          description="オフにすると自分以外はフォロー中の一覧を見られません"
          value={settings.followingListVisibility === "public"}
          disabled={saving}
          onValueChange={(value) => toggle("followingListVisibility", value)}
        />
        <SettingsSwitch
          title="フォロワーの一覧を公開"
          description="オフにすると自分以外はフォロワーの一覧を見られません"
          value={settings.followerListVisibility === "public"}
          disabled={saving}
          onValueChange={(value) => toggle("followerListVisibility", value)}
        />
      </SettingsGroup>
    </SettingsPage>
  );
};
