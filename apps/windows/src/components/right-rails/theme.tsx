import { themeAtom } from "@/atoms/theme";
import { getCdnUrl } from "@/models/cdn";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { Calendar } from "lucide-react-native";
import { Image, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { RailCard, RailRow } from "../ui/rail";

const UniCalendar = withUniwind(Calendar);

export const Theme = () => {
  const theme = useAtomValue(themeAtom);
  const width = 320 - 16 * 2;

  if (!theme) {
    return null;
  }

  const hasBanner = !!theme.bannerUrl;
  const remainingDays = Math.max(0, dayjs(theme.until).diff(dayjs(), "day") + 1);

  return <RailCard title="今週のお題">
    <View className="gap-1.5 py-2.5">
      <RailRow label={theme.title}>
        <View className="flex gap-2 pb-2">
          <View className="overflow-hidden rounded-sm">
            {hasBanner ? <Image source={{ uri: getCdnUrl({ src: theme.bannerUrl!, variant: "header", width: 150 }) }} width={width} height={width / 3} /> : <View className="flex items-center justify-center bg-light-surface-muted dark:bg-dark-surface-muted" style={{ width, height: width / 3 }}>
              <UniCalendar className="text-light-text-subtle dark:text-dark-text-subtle" />
            </View>}
          </View>

          <View className="flex flex-col gap-2 px-4">
            <Text>{theme.title}</Text>
            <View>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                {`残り${remainingDays}日・${theme.statusCount}件の投稿`}
              </Text>
            </View>
          </View>
        </View>
      </RailRow>
    </View>
  </RailCard>;
};
