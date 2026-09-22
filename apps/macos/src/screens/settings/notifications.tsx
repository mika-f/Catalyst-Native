import { accountAtom } from "@/atoms/account";
import { clientAtom } from "@/atoms/credential";
import {
  SettingsGroup,
  SettingsLoading,
  SettingsMessage,
  SettingsPage,
  SettingsSwitch,
  type SettingsPageProps,
} from "@/components/settings-ui";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

type WeeklyThemeSubscription = {
  notifyOnOpen: boolean;
  notifyOnStreak: boolean;
  notifyBeforeClose: boolean;
};

const ROWS: { key: keyof WeeklyThemeSubscription; title: string; description: string }[] = [
  { key: "notifyOnOpen", title: "新しいお題", description: "毎週月曜日に開催されるお題をお知らせします" },
  { key: "notifyOnStreak", title: "連続参加ボーナス", description: "連続参加のボーナス獲得時にお知らせします" },
  { key: "notifyBeforeClose", title: "終了前のお知らせ", description: "お題の終了前にお知らせします" },
];

export const NotificationsPage = ({ onBack }: SettingsPageProps) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const [subscription, setSubscription] = useState<WeeklyThemeSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(account !== null);
  const [failed, setFailed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    client.catalyst.v1.weeklyThemes.subscription
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (!ignore) setSubscription(data);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [account, client]);

  const toggle = async (key: keyof WeeklyThemeSubscription, value: boolean) => {
    if (!subscription || updating) return;
    const previous = subscription;
    const next = { ...previous, [key]: value };
    setSubscription(next);
    setUpdating(true);
    try {
      const { data } = await client.catalyst.v1.weeklyThemes.subscription.patch({
        body: next,
        throwOnError: true,
      });
      setSubscription(data);
    } catch {
      setSubscription(previous);
    } finally {
      setUpdating(false);
    }
  };

  if (!account) {
    return <SettingsMessage title="通知" onBack={onBack} message="ログインするとお題の通知を設定できます。" />;
  }
  if (isLoading) return <SettingsLoading title="通知" onBack={onBack} />;
  if (failed || !subscription) {
    return <SettingsMessage title="通知" onBack={onBack} message="通知設定を読み込めませんでした。時間をおいて再度お試しください。" />;
  }

  return (
    <SettingsPage title="通知" onBack={onBack}>
      <SettingsGroup title="お題" footer="お題の通知は、初期設定ではオフです。">
        {ROWS.map((row) => (
          <SettingsSwitch
            key={row.key}
            title={row.title}
            description={row.description}
            value={subscription[row.key]}
            disabled={updating}
            onValueChange={(value) => toggle(row.key, value)}
          />
        ))}
      </SettingsGroup>
    </SettingsPage>
  );
};
