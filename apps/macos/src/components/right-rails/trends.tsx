import { trendsAtom } from "@/atoms/trends";
import { CatalystTrend } from "@/models/sdk-types";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { ArrowDown, ArrowRight, ArrowUp, Sparkles } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Badge, type BadgeVariant } from "./badge";
import { RailCard, RailRow } from "./rail";

type RichTrend = Exclude<CatalystTrend, string>;

const UniArrowUp = withUniwind(ArrowUp);
const UniArrowDown = withUniwind(ArrowDown);
const UniArrowRight = withUniwind(ArrowRight);
const UniSparkles = withUniwind(Sparkles);

const MOVEMENT: Record<RichTrend["movement"], { label: string; Icon: typeof UniArrowUp; variant: BadgeVariant }> = {
  up: { label: "上昇", Icon: UniArrowUp, variant: "success" },
  down: { label: "下降", Icon: UniArrowDown, variant: "error" },
  new: { label: "新着", Icon: UniSparkles, variant: "warning" },
  same: { label: "維持", Icon: UniArrowRight, variant: "default" },
};

const isRichTrend = (trend: CatalystTrend): trend is RichTrend => typeof trend !== "string";

export const Trends = () => {
  const trends = useAtomValue(trendsAtom).filter(isRichTrend);

  if (trends.length === 0) {
    return null;
  }

  return (
    <RailCard title="トレンド">
      <View className="gap-2 py-2.5">
        {trends.map((trend, i) => {
          const movement = MOVEMENT[trend.movement];
          const Arrow = movement.Icon;

          return (
            <RailRow key={trend.tag} label="トレンド">
              <View className="flex flex-col gap-1 px-2 py-2.5">
                <View className="flex flex-row justify-between">
                  <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">#{i + 1} Trending</Text>
                  <Badge variant={movement.variant}>
                    {({ textClassName, iconClassName }) => (
                      <View className="flex flex-row items-center gap-1">
                        <Arrow size={16} colorClassName={iconClassName} />
                        <Text className={cn("text-xs", textClassName)}>{movement.label}</Text>
                      </View>
                    )}
                  </Badge>
                </View>
                <Text className="text-lg text-light-text dark:text-dark-text">{trend.tag}</Text>
                <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
                  前回 #{trend.previousRank ?? "-"}
                </Text>
              </View>
            </RailRow>
          );
        })}
      </View>
    </RailCard>
  );
};
