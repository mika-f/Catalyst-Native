import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { CatalystContest } from "@/models/sdk-types";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Trophy } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniTrophy = withUniwind(Trophy);

type Props = {
  contest: CatalystContest;
};

const STATE_LABEL: Record<string, string> = {
  opening: "作品受付中",
  voting: "投票受付中",
  closing: "投票準備中",
  electing: "結果準備中",
  published: "開催予定",
  closed: "終了",
};

const fmt = (d: string) => dayjs(d).format("YYYY/MM/DD");

const getPeriodText = (contest: CatalystContest): string => {
  switch (contest.state) {
    case "opening":
      return `受付終了: ${fmt(contest.until)}`;
    case "voting":
      return `投票終了: ${fmt(contest.voting.until)}`;
    case "closing":
    case "electing":
      return `結果発表予定: ${fmt(contest.winnersOpenAt)}`;
    case "published":
      return `開始予定: ${fmt(contest.since)}`;
    case "closed":
      return `終了: ${fmt(contest.winnersOpenAt)}`;
    default:
      return "";
  }
};

export const ContestCard = ({ contest }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      className="mx-2 my-1.5 bg-light-surface dark:bg-dark-surface rounded-xl overflow-hidden"
      onPress={() => router.push(`/contest/${contest.slug}` as never)}
    >
      {/* ヘッダー画像 */}
      {contest.headerUrl ? (
        <UniImage
          source={{ uri: getCdnUrl({ src: contest.headerUrl, variant: "header", width: 1500 }) }}
          className="w-full h-32"
          contentFit="cover"
        />
      ) : (
        <View className="w-full h-32 bg-neutral-200 dark:bg-neutral-800 items-center justify-center">
          <UniTrophy size={40} className="text-neutral-400" />
        </View>
      )}

      {/* コンテスト情報 */}
      <View className="p-3 gap-1.5">
        {/* ステートバッジ */}
        <View
          className={cn(
            "self-start px-2 py-0.5 rounded-full",
            contest.state === "opening" && "bg-light-success-background dark:bg-dark-success-background",
            contest.state === "voting" && "bg-light-info-background dark:bg-dark-info-background",
            (contest.state === "closing" || contest.state === "electing") &&
              "bg-light-warning-background dark:bg-dark-warning-background",
            (contest.state === "published" || contest.state === "closed") &&
              "bg-light-surface-muted dark:bg-dark-surface-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-semibold",
              contest.state === "opening" && "text-light-success-foreground dark:text-dark-success-foreground",
              contest.state === "voting" && "text-light-info-foreground dark:text-dark-info-foreground",
              (contest.state === "closing" || contest.state === "electing") &&
                "text-light-warning-foreground dark:text-dark-warning-foreground",
              (contest.state === "published" || contest.state === "closed") &&
                "text-light-text-muted dark:text-dark-text-muted",
            )}
          >
            {STATE_LABEL[contest.state] ?? contest.state}
          </Text>
        </View>

        {/* タイトル */}
        <Text className="text-base font-bold text-light-text dark:text-dark-text" numberOfLines={2}>
          {contest.title}
        </Text>

        {/* テーマ */}
        {contest.theme && (
          <Text className="text-sm text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
            テーマ: {contest.theme}
          </Text>
        )}

        {/* 期間 */}
        <Text className="text-xs text-light-text-subtle dark:text-dark-text-subtle">{getPeriodText(contest)}</Text>
      </View>
    </Pressable>
  );
};
