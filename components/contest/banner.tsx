import { CatalystText, type CatalystBadgeTone } from "@/components/design-system";
import type { CatalystContest } from "@/models/sdk-types";
import { useRouter } from "expo-router";
import { ChevronRight, Trophy } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UniTrophy = withUniwind(Trophy);
const UniChevronRight = withUniwind(ChevronRight);

const STATE_LABEL: Record<string, string> = {
  opening: "作品受付中",
  voting: "投票受付中",
  closing: "投票準備中",
  electing: "結果準備中",
  published: "開催予定",
  closed: "終了",
};

const STATE_BADGE_TONE: Record<string, CatalystBadgeTone> = {
  opening: "success",
  voting: "info",
  closing: "warning",
  electing: "warning",
  published: "neutral",
  closed: "neutral",
};

type Props = {
  contest: Pick<CatalystContest, "slug" | "title" | "headerUrl">;
};

export const ContestBanner = ({ contest }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-xl border border-light-toggle-border bg-light-toggle px-3.5 py-3 active:opacity-80 dark:border-dark-toggle-border dark:bg-dark-toggle"
      onPress={() => router.push(`/contest/${contest.slug}` as never)}
    >
      <UniTrophy size={20} className="text-light-toggle-icon dark:text-dark-toggle-icon" />

      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <CatalystText
            variant="caption"
            className="font-semibold text-light-toggle-foreground dark:text-dark-toggle-foreground"
          >
            このコンテストに参加中
          </CatalystText>
        </View>
        <CatalystText
          variant="label"
          numberOfLines={1}
          className="text-light-toggle-foreground dark:text-dark-toggle-foreground"
        >
          {contest.title}
        </CatalystText>
      </View>

      <UniChevronRight size={18} className="text-light-toggle-icon dark:text-dark-toggle-icon" />
    </Pressable>
  );
};
