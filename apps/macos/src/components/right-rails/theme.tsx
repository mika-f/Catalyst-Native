import { themeAtom } from "@/atoms/theme";
import { useAtomValue } from "jotai";
import { Calendar } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { RailBanner, RailCard, RailRow } from "./rail";

const UniCalendar = withUniwind(Calendar);
const DAY_MS = 86_400_000;

// dayjs の diff("day") と同じく、経過ミリ秒を日数で切り捨ててから開催日を 1 日分含める
const inclusiveDaysLeft = (until: string) => {
  const ms = new Date(until).getTime() - Date.now();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.trunc(ms / DAY_MS) + 1);
};

export const Theme = () => {
  const theme = useAtomValue(themeAtom);

  if (!theme) {
    return null;
  }

  const remainingDays = inclusiveDaysLeft(theme.until);

  return (
    <RailCard title="今週のお題">
      <View className="gap-1.5 py-2.5">
        <RailRow label={theme.title}>
          <View className="gap-2 pb-2">
            <RailBanner
              uri={theme.bannerUrl}
              fallback={
                <UniCalendar size={24} colorClassName="accent-light-text-subtle dark:accent-dark-text-subtle" />
              }
            />
            <View className="flex flex-col gap-2 px-4">
              <Text className="text-light-text dark:text-dark-text">{theme.title}</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                {`残り${remainingDays}日・${theme.statusCount}件の投稿`}
              </Text>
            </View>
          </View>
        </RailRow>
      </View>
    </RailCard>
  );
};
