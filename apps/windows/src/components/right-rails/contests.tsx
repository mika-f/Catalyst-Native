import { contestsAtom } from "@/atoms/contests";
import { getCdnUrl } from "@/models/cdn";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { CalendarDays } from "lucide-react-native";
import { Image, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Badge, toVariantClassName } from "../ui/badge";
import { RailCard, RailRow } from "../ui/rail";

const UniCalendarDays = withUniwind(CalendarDays);

const STATE_TO_VARIANT: Record<string, "success" | "info" | "error" | "warning" | "default"> = {
  published: "info",
  opening: "success",
  voting: "warning",
};

export const Contests = () => {
  const contests = useAtomValue(contestsAtom);
  const width = 320 - 16 * 2;

  if (contests.length === 0) {
    return null;
  }

  return <RailCard title="開催中のフォトコンテスト">
    <View className="gap-1.5 py-2.5">
      {contests.map((contest) => {

        return (
          <RailRow key={contest.slug} label="コンテスト">
            <View className="flex gap-2 pb-2">
              <View className="overflow-hidden rounded-sm">
                <Image source={{ uri: getCdnUrl({ src: contest.headerUrl, variant: "header", width: 150 }) }} width={width} height={width / 3} />
              </View>

              <View className="flex flex-col gap-2 px-4">
                <View className="flex flex-row items-center gap-2">
                  <UniCalendarDays size={16} className={toVariantClassName(STATE_TO_VARIANT[contest.state])} />
                  <Badge variant={STATE_TO_VARIANT[contest.state]}>
                    {({ textClassName }) => <View className="flex flex-col gap-2">
                      <Text className={cn("px-1 py-0.5 text-xs", textClassName)}>
                        {contest.state === "published" && "開催予定"}
                        {contest.state === "opening" && "開催中"}
                        {contest.state === "voting" && "投票受付中"}
                      </Text></View>}
                  </Badge>
                </View>
                <Text>{contest.title}</Text>
                <Text className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">主催: {contest.organizer.displayName}</Text>
              </View>
            </View>
          </RailRow>
        )
      })}
    </View>
  </RailCard>;
};
