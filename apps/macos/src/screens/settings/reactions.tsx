import { accountAtom } from "@/atoms/account";
import {
  confirm,
  SettingsGroup,
  SettingsInfo,
  SettingsLoading,
  SettingsMessage,
  SettingsPage,
  type SettingsPageProps,
} from "@/components/settings-ui";
import type { CatalystCustomReactionList, CatalystUserCustomReaction } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";

const PLAN_LABELS: Record<CatalystCustomReactionList["plan"], string> = {
  none: "—",
  tier_0: "Tier 0",
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
  tier_4: "Tier 4",
  tier_5: "Tier 5",
};

export const ReactionsPage = ({ onBack }: SettingsPageProps) => {
  const account = useAtomValue(accountAtom);
  const [reactionList, setReactionList] = useState<CatalystCustomReactionList | null>(null);
  const [isLoading, setIsLoading] = useState(account !== null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!account) return;
    let ignore = false;
    account.credential.client.catalyst.v1.customReactions
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (!ignore) setReactionList(data);
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
  }, [account]);

  const handleDelete = async (item: CatalystUserCustomReaction) => {
    if (!account) return;
    const accepted = await confirm("リアクションを削除しますか？", `「${item.displayName}」を削除します。この操作は取り消せません。`, "削除", true);
    if (!accepted) return;
    try {
      await account.credential.client.catalyst.v1.customReactions.id.delete({
        path: { id: item.id },
        throwOnError: true,
      });
      setReactionList((prev) =>
        prev
          ? { ...prev, used: Math.max(0, prev.used - 1), items: prev.items.filter((reaction) => reaction.id !== item.id) }
          : prev,
      );
    } catch {
      Alert.alert("リアクションを削除できませんでした", "時間をおいて再度お試しください。");
    }
  };

  if (!account) {
    return (
      <SettingsMessage title="カスタムリアクション" onBack={onBack} message="ログインするとカスタムリアクションを管理できます。" />
    );
  }
  if (isLoading) return <SettingsLoading title="カスタムリアクション" onBack={onBack} />;
  if (failed || !reactionList) {
    return (
      <SettingsMessage
        title="カスタムリアクション"
        onBack={onBack}
        message="カスタムリアクションを読み込めませんでした。時間をおいて再度お試しください。"
      />
    );
  }

  return (
    <SettingsPage title="カスタムリアクション" onBack={onBack}>
      <SettingsGroup
        title="プラン"
        footer={reactionList.limit === 0 ? "サポーター登録をするとカスタムリアクションを利用できます。" : undefined}
      >
        <SettingsInfo title="プラン" value={PLAN_LABELS[reactionList.plan]} />
        <SettingsInfo title="使用数" value={`${reactionList.used} / ${reactionList.limit}`} />
      </SettingsGroup>

      {reactionList.items.length > 0 && (
        <SettingsGroup title="登録済みリアクション">
          {reactionList.items.map((item) => (
            <View key={item.id} className="min-h-14 flex-row items-center gap-3 px-4 py-2.5">
              <Image
                source={{ uri: item.imageUrl }}
                accessibilityLabel={item.displayName}
                resizeMode="contain"
                className="size-8"
              />
              <View className="flex-1 gap-0.5">
                <Text numberOfLines={1} className="text-[13px] font-medium text-light-text dark:text-dark-text">
                  {item.displayName}
                </Text>
                <Text numberOfLines={1} className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  :{item.shortcode}:
                </Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.displayName} を削除`} onPress={() => handleDelete(item)} hitSlop={8}>
                <Text className="text-[13px] font-medium text-light-error dark:text-dark-error">削除</Text>
              </Pressable>
            </View>
          ))}
        </SettingsGroup>
      )}

      {reactionList.items.length === 0 && reactionList.limit > 0 && (
        <Text className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
          カスタムリアクションがまだありません。
        </Text>
      )}
    </SettingsPage>
  );
};
