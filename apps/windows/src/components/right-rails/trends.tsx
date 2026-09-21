import { trendsAtom } from "@/atoms/trends";
import { CatalystTrend } from "@/models/sdk-types";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { ArrowDown, ArrowRight, ArrowUp, LucideIcon, Sparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Badge } from "../ui/badge";
import { RailCard, RailRow } from "../ui/rail";

type NotString<T> = Exclude<T, string>;
type Assertion = <T extends CatalystTrend>(val: T[]) => asserts val is NotString<T>[];

const MOVEMENT_TO_VARIANT: Record<string, "success" | "error" | "warning" | "default"> = {
  up: "success",
  down: "error",
  new: "warning",
  same: "default",
};

const assert: Assertion = <T extends CatalystTrend>(val: T[]): asserts val is NotString<T>[] => {
  if (!val.every(item => typeof item !== "string")) {
    throw new Error("Array contains a string");
  }
};

export const Trends = () => {
  const trends = useAtomValue(trendsAtom);
  assert(trends);

  const label = (movement: (typeof trends)[number]["movement"]): { label: string; arrow: LucideIcon; } => {
    switch (movement) {
      case "up":
        return { label: "上昇", arrow: ArrowUp };

      case "down":
        return { label: "下降", arrow: ArrowDown };

      case "new":
        return { label: "新着", arrow: Sparkles };

      default:
        return { label: "維持", arrow: ArrowRight };
    }
  };

  if (trends.length === 0) {
    return null;
  }

  return <RailCard title="トレンド">
    <View className="gap-2 py-2.5">
      {trends.map((trend, i) => {
        const movement = label(trend.movement);
        const Arrow = withUniwind(movement.arrow);

        return (
          <RailRow key={trend.tag} label="トレンド">
            <View className="flex flex-col gap-1 px-2 py-2.5">
              <View className="flex flex-row justify-between">
                <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">#{i + 1} Trending</Text>
                <Badge variant={MOVEMENT_TO_VARIANT[trend.movement]}>
                  {({ textClassName }) => <View className={cn("flex flex-row items-center gap-1")}>
                    <Arrow size={16} className={textClassName} />
                    <Text className={cn("text-xs", textClassName)}>{movement.label}</Text>
                  </View>}
                </Badge>
              </View>
              <Text className="text-lg text-light-text dark:text-dark-text">{trend.tag}</Text>
              <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">前回 #{trend.previousRank ?? "-"}</Text>
            </View>
          </RailRow>
        )
      })}
    </View>
  </RailCard>
};

