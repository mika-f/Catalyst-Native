import { accountAtom } from "@/models/atoms/account";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";

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

async function loadCachedSettings(): Promise<PrivacySettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return JSON.parse(raw) as PrivacySettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveCachedSettings(settings: PrivacySettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function PrivacySettingsPage() {
  const account = useAtomValue(accountAtom);
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof PrivacySettings | null>(null);

  useEffect(() => {
    if (!account) {
      loadCachedSettings().then((s) => {
        setSettings(s);
        setIsLoading(false);
      });
      return;
    }

    account.credential.client.catalyst.v1.privacy.settings
      .get({ throwOnError: true })
      .then(async ({ data: s }) => {
        setSettings(s);
        await saveCachedSettings(s);
      })
      .catch(() => loadCachedSettings().then(setSettings))
      .finally(() => setIsLoading(false));
  }, [account]);

  const handleToggle = useCallback(
    async (key: keyof PrivacySettings, newValue: boolean) => {
      if (!account) return;

      const updated: PrivacySettings = {
        ...settings,
        [key]: newValue ? "public" : "private",
      };

      setSavingKey(key);
      try {
        await account.credential.client.catalyst.v1.privacy.settings.patch({
          body: updated,
          throwOnError: true,
        });
        setSettings(updated);
        await saveCachedSettings(updated);
      } finally {
        setSavingKey(null);
      }
    },
    [account, settings],
  );

  if (isLoading) {
    return <View className="flex-1 bg-light-surface dark:bg-dark-background" />;
  }

  if (!account) {
    return (
      <View className="flex-1 bg-light-surface dark:bg-dark-background">
        <Text className="mt-8 mx-4 text-sm text-light-gray dark:text-dark-gray text-center">
          ログインするとプライバシー設定を変更できます。
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-surface dark:bg-dark-background">
      <View className="mt-4 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">フォロー・フォロワー</Text>
        <View className="rounded-xl bg-light-background dark:bg-dark-surface overflow-hidden">
          <View className="px-4 py-3 flex-row items-center justify-between border-b border-light-border dark:border-dark-border">
            <View className="flex-1 mr-3">
              <Text className="text-base text-light-text dark:text-dark-text">フォロー中の一覧を公開</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                オフにすると自分以外はフォロー中の一覧を見られません
              </Text>
            </View>
            {savingKey === "followingListVisibility" ? (
              <ActivityIndicator size="small" />
            ) : (
              <Switch
                value={settings.followingListVisibility === "public"}
                onValueChange={(v) => handleToggle("followingListVisibility", v)}
              />
            )}
          </View>
          <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base text-light-text dark:text-dark-text">フォロワーの一覧を公開</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                オフにすると自分以外はフォロワーの一覧を見られません
              </Text>
            </View>
            {savingKey === "followerListVisibility" ? (
              <ActivityIndicator size="small" />
            ) : (
              <Switch
                value={settings.followerListVisibility === "public"}
                onValueChange={(v) => handleToggle("followerListVisibility", v)}
              />
            )}
          </View>
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          設定はサーバーに保存されます。
        </Text>
      </View>
    </View>
  );
}
