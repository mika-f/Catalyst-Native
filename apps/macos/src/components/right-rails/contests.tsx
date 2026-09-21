import { contestsAtom } from "@/atoms/contests";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { CalendarDays } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Badge, toVariantIconClassName, type BadgeVariant } from "./badge";
import { RailBanner, RailCard, RailRow } from "./rail";

const UniCalendarDays = withUniwind(CalendarDays);

const STATE: Record<string, { label: string; variant: BadgeVariant }> = {
  published: { label: "開催予定", variant: "info" },
  opening: { label: "開催中", variant: "success" },
  voting: { label: "投票受付中", variant: "warning" },
};

export const Contests = () => {
  const contests = useAtomValue(contestsAtom);

  if (contests.length === 0) {
    return null;
  }

  return (
    <RailCard title="開催中のフォトコンテスト">
      <View className="gap-1.5 py-2.5">
        {contests.map((contest) => {
          const state = STATE[contest.state] ?? { label: contest.state, variant: "default" as const };

          return (
            <RailRow key={contest.slug} label="コンテスト">
              <View className="gap-2 pb-2">
                <RailBanner uri={contest.headerUrl} />
                <View className="flex flex-col gap-2 px-4">
                  <View className="flex flex-row items-center gap-2">
                    <UniCalendarDays size={16} colorClassName={toVariantIconClassName(state.variant)} />
                    <Badge variant={state.variant}>
                      {({ textClassName }) => (
                        <Text className={cn("px-1 py-0.5 text-xs", textClassName)}>{state.label}</Text>
                      )}
                    </Badge>
                  </View>
                  <Text className="text-light-text dark:text-dark-text">{contest.title}</Text>
                  <Text className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">
                    主催: {contest.organizer.displayName}
                  </Text>
                </View>
              </View>
            </RailRow>
          );
        })}
      </View>
    </RailCard>
  );
};
