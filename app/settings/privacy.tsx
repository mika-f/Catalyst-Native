import {
  CatalystDivider,
  CatalystEmptyState,
  CatalystListItemContent,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import { accountAtom } from "@/models/atoms/account";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

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

    account.credential.client.catalyst
      .getPrivacySettings()
      .then(async (s) => {
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
        await account.credential.client.catalyst.updatePrivacySettings(updated);
        setSettings(updated);
        await saveCachedSettings(updated);
      } finally {
        setSavingKey(null);
      }
    },
    [account, settings],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-surface-muted dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!account) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <CatalystEmptyState title="ログインが必要です" description="ログインするとプライバシー設定を変更できます。" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          フォロー・フォロワー
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                フォロー中の一覧を公開
              </CatalystText>
              <CatalystText variant="caption" tone="muted">
                オフにすると自分以外はフォロー中の一覧を見られません
              </CatalystText>
            </CatalystListItemContent>
            {savingKey === "followingListVisibility" ? (
              <ActivityIndicator size="small" />
            ) : (
              <CatalystSwitch
                value={settings.followingListVisibility === "public"}
                onValueChange={(v) => handleToggle("followingListVisibility", v)}
              />
            )}
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                フォロワーの一覧を公開
              </CatalystText>
              <CatalystText variant="caption" tone="muted">
                オフにすると自分以外はフォロワーの一覧を見られません
              </CatalystText>
            </CatalystListItemContent>
            {savingKey === "followerListVisibility" ? (
              <ActivityIndicator size="small" />
            ) : (
              <CatalystSwitch
                value={settings.followerListVisibility === "public"}
                onValueChange={(v) => handleToggle("followerListVisibility", v)}
              />
            )}
          </View>
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          設定はサーバーに保存されます。
        </CatalystText>
      </View>
    </View>
  );
}
