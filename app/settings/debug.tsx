import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import {
  getDismissedContestSpotlightIds,
  resetDismissedContestSpotlightIds,
} from "@/models/contest-spotlight";
import { RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { withUniwind } from "uniwind";

const ResetIcon = withUniwind(RotateCcw);

export default function DebugSettingsPage() {
  const [dismissedContestCount, setDismissedContestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const loadDismissedContestCount = useCallback(async () => {
    const ids = await getDismissedContestSpotlightIds();
    setDismissedContestCount(ids.size);
  }, []);

  useEffect(() => {
    // AsyncStorage の現在値を初回表示に同期するため、この画面だけ effect 内で state を更新する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDismissedContestCount()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [loadDismissedContestCount]);

  const handleResetContestSpotlight = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetDismissedContestSpotlightIds();
      setDismissedContestCount(0);
      Alert.alert("リセットしました", "非表示にしたコンテスト情報を再表示できるようにしました。");
    } finally {
      setIsResetting(false);
    }
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-light-surface-muted dark:bg-dark-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          タイムライン
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="px-5 py-3">
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">
              非表示にしたコンテスト情報
            </CatalystText>
            <CatalystText variant="caption" tone="muted" className="mt-1">
              {dismissedContestCount}件のコンテストがタイムラインのスポットライトから非表示になっています。
            </CatalystText>
          </View>

          <CatalystDivider className="ml-5 w-auto" />
          <CatalystListItem
            divided={false}
            className="min-h-14 px-5 py-3 disabled:opacity-50"
            disabled={isResetting}
            onPress={handleResetContestSpotlight}
          >
            {isResetting ? (
              <ActivityIndicator size="small" />
            ) : (
              <ResetIcon size={20} className="text-light-tint dark:text-dark-tint" />
            )}
            <CatalystListItemContent className="gap-0">
              <CatalystText variant="subtitle" tone="tint" className="text-[15px] font-semibold">
                コンテスト情報の非表示をリセット
              </CatalystText>
            </CatalystListItemContent>
          </CatalystListItem>
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          リセット後、条件に合うコンテスト情報がタイムライン上部に再表示されます。
        </CatalystText>
      </View>
    </View>
  );
}
