import { accountAtom } from "@/atoms/account";
import {
  confirm,
  SettingsAction,
  SettingsGroup,
  SettingsInfo,
  SettingsLink,
  SettingsLoading,
  SettingsMessage,
  SettingsPage,
  type SettingsPageProps,
} from "@/components/settings-ui";
import type { CatalystActivityPubSettings } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Alert, Linking, Text, View } from "react-native";

const STATE_LABEL: Record<CatalystActivityPubSettings["state"], string> = {
  unavailable: "有効化条件を満たしていません",
  eligible: "有効化できます",
  active: "連合中",
  retired: "連合終了済み",
};

const ELIGIBILITY_MESSAGE: Record<CatalystActivityPubSettings["eligibilityReason"], string> = {
  "screen-name-required": "先にアカウント設定でユーザー名を変更し、確定してください。",
  suspended: "凍結中のアカウントでは ActivityPub を有効化できません。",
  "account-deleted": "このアカウントでは ActivityPub を有効化できません。",
};

export const ActivityPubPage = ({ onBack }: SettingsPageProps) => {
  const account = useAtomValue(accountAtom);
  const [settings, setSettings] = useState<CatalystActivityPubSettings | null>(null);
  const [isLoading, setIsLoading] = useState(account !== null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    account.credential.client.catalyst.v1.activitypub.settings
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (!ignore) setSettings(data);
      })
      .catch(() => {
        if (!ignore) setSettings(null);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [account]);

  const updateFederation = async (action: "enable" | "retire") => {
    if (!account || isSaving) return;
    setIsSaving(true);
    try {
      const response =
        action === "enable"
          ? await account.credential.client.catalyst.v1.activitypub.settings.create({ throwOnError: true })
          : await account.credential.client.catalyst.v1.activitypub.settings.delete({ throwOnError: true });
      setSettings(response.data);
      Alert.alert(action === "enable" ? "ActivityPub 連合を開始しました" : "ActivityPub 連合を終了しました");
    } catch {
      Alert.alert("ActivityPub 設定を更新できませんでした", "時間をおいて再度お試しください。");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmEnable = async () => {
    const accepted = await confirm(
      "ActivityPub 連合を開始しますか？",
      "プロフィールと投稿の複製が外部サーバーへ保存される可能性があります。有効化後は未公開状態へ戻せません。",
      "連合を開始",
    );
    if (accepted) await updateFederation("enable");
  };

  const confirmRetire = async () => {
    const accepted = await confirm(
      "ActivityPub 連合を完全に終了しますか？",
      "この操作は取り消せず、同じ Actor を再有効化できません。外部サーバー上の複製が確実に削除される保証はありません。",
      "連合を終了",
      true,
    );
    if (accepted) await updateFederation("retire");
  };

  if (!account) {
    return <SettingsMessage title="ActivityPub 連合" onBack={onBack} message="ログインすると連合設定を確認できます。" />;
  }
  if (isLoading) return <SettingsLoading title="ActivityPub 連合" onBack={onBack} />;
  if (!settings) {
    return (
      <SettingsMessage title="ActivityPub 連合" onBack={onBack} message="連合設定を取得できませんでした。時間をおいて再度お試しください。" />
    );
  }
  if (!settings.rolloutEligible && (settings.state === "eligible" || settings.state === "unavailable")) {
    return (
      <SettingsMessage
        title="ActivityPub 連合"
        onBack={onBack}
        message="この機能は段階的に提供されています。利用可能になるまでお待ちください。"
      />
    );
  }

  const handle = `@${account.user.screenName}@catalyst.natsuneko.com`;

  return (
    <SettingsPage title="ActivityPub 連合" onBack={onBack}>
      <Text className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
        Mastodon や Misskey など、外部の対応サービスからプロフィールと公開投稿を参照できるようにします。
      </Text>
      <SettingsGroup title="連合上の識別情報">
        <SettingsInfo title="状態" value={STATE_LABEL[settings.state]} />
        <SettingsInfo title="ハンドル" value={handle} />
        {settings.actorUri && (
          <SettingsLink
            title="Actor URI"
            description={settings.actorUri}
            external
            onPress={() => Linking.openURL(settings.actorUri!).catch((error) => console.error(error))}
          />
        )}
      </SettingsGroup>
      <SettingsGroup
        title="連合ライフサイクル"
        footer="一度外部サーバーへ配送されたプロフィールや投稿は、削除通知後も相手側に残る可能性があります。"
      >
        {settings.state === "eligible" && (
          <SettingsAction label="連合を開始" busy={isSaving} busyLabel="開始しています" onPress={confirmEnable} />
        )}
        {settings.state === "active" && (
          <SettingsAction label="連合を終了" tone="danger" busy={isSaving} busyLabel="終了しています" onPress={confirmRetire} />
        )}
        {settings.state === "unavailable" && (
          <View className="px-4 py-3">
            <Text className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
              {ELIGIBILITY_MESSAGE[settings.eligibilityReason]}
            </Text>
          </View>
        )}
        {settings.state === "retired" && (
          <View className="px-4 py-3">
            <Text className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
              Actor URI は削除済み Actor として保持され、再有効化できません。
            </Text>
          </View>
        )}
      </SettingsGroup>
    </SettingsPage>
  );
};
