import { clientAtom } from "@/atoms/credential";
import { useHover } from "@/hooks/use-hover";
import type { CatalystContest } from "@/models/sdk-types";
import { createTabNavigator, type NavigationItemContentProps } from "@natsuneko-laboratory/react-native-desktop-navigation";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { CalendarDays, Trophy } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { Badge, toVariantIconClassName, type BadgeVariant } from "../components/right-rails/badge";
import { RailBanner } from "../components/right-rails/rail";
import { EmptyState, Skeleton } from "../components/ui";

const UniCalendarDays = withUniwind(CalendarDays);
const UniTrophy = withUniwind(Trophy);

type ContestState = "published" | "opening" | "closing" | "voting" | "electing" | "closed";
type Tab = "open" | "upcoming" | "closed";

const TAB_STATES: Record<Tab, ContestState[]> = {
  open: ["opening", "voting", "closing", "electing"],
  upcoming: ["published"],
  closed: ["closed"],
};

const EMPTY_TITLE: Record<Tab, string> = {
  open: "開催中のコンテストはありません",
  upcoming: "開催予定のコンテストはありません",
  closed: "終了したコンテストはありません",
};

const STATE: Record<string, { label: string; variant: BadgeVariant }> = {
  published: { label: "開催予定", variant: "info" },
  opening: { label: "開催中", variant: "success" },
  voting: { label: "投票受付中", variant: "warning" },
  closing: { label: "投票準備中", variant: "warning" },
  electing: { label: "結果準備中", variant: "warning" },
  closed: { label: "終了", variant: "default" },
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}/${month}/${day}`;
};

const periodText = (contest: CatalystContest) => {
  switch (contest.state) {
    case "opening":
      return `受付終了: ${formatDate(contest.until)}`;
    case "voting":
      return `投票終了: ${formatDate(contest.voting.until)}`;
    case "closing":
    case "electing":
      return `結果発表予定: ${formatDate(contest.winnersOpenAt)}`;
    case "published":
      return `開始予定: ${formatDate(contest.since)}`;
    case "closed":
      return `終了: ${formatDate(contest.winnersOpenAt)}`;
    default:
      return "";
  }
};

const ContestCard = ({ contest }: { contest: CatalystContest }) => {
  const { hovered, hoverProps } = useHover();
  const state = STATE[contest.state] ?? { label: contest.state, variant: "default" as const };
  const period = periodText(contest);

  return (
    <Pressable
      focusable
      className={cn(
        "overflow-hidden rounded-2xl border border-light-divider dark:border-dark-divider",
        hovered
          ? "bg-light-surface-elevated dark:bg-dark-surface-elevated"
          : "bg-light-surface dark:bg-dark-surface",
      )}
      {...hoverProps}
    >
      <RailBanner
        uri={contest.headerUrl}
        fallback={<UniTrophy size={28} colorClassName="accent-light-text-subtle dark:accent-dark-text-subtle" />}
      />
      {/* macOS では Text の固有高さが h-* を上書きしてカードごとに伸びるため、行ボックスはピクセルで固定する */}
      <View className="gap-2 p-4">
        <View className="h-6 flex-row items-center gap-2">
          <UniCalendarDays size={16} colorClassName={toVariantIconClassName(state.variant)} />
          <Badge variant={state.variant}>
            {({ textClassName }) => <Text className={cn("px-1 py-0.5 text-xs", textClassName)}>{state.label}</Text>}
          </Badge>
        </View>
        <View className="overflow-hidden" style={{ height: 48 }}>
          <Text numberOfLines={2} className="text-[15px] font-semibold leading-6 text-light-text dark:text-dark-text">
            {`${contest.title}\n\u00a0`}
          </Text>
        </View>
        <View className="overflow-hidden" style={{ height: 20 }}>
          <Text numberOfLines={1} className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">
            {contest.theme.length > 0 ? `テーマ: ${contest.theme}` : "\u00a0"}
          </Text>
        </View>
        <View className="overflow-hidden" style={{ height: 16 }}>
          <Text numberOfLines={1} className="text-xs leading-4 text-light-text-subtle dark:text-dark-text-subtle">
            {period.length > 0 ? period : "\u00a0"}
          </Text>
        </View>
        <View className="overflow-hidden" style={{ height: 16 }}>
          <Text numberOfLines={1} className="text-xs leading-4 text-light-text-muted dark:text-dark-text-muted">
            {`主催: ${contest.organizer.displayName}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const CardSkeleton = () => {
  return (
    <View className="overflow-hidden rounded-2xl border border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface">
      <Skeleton className="aspect-[3/1] w-full rounded-none" />
      <View className="gap-2 p-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </View>
    </View>
  );
};

const ContestGrid = ({ tab }: { tab: Tab }) => {
  const client = useAtomValue(clientAtom);
  const [contests, setContests] = useState<CatalystContest[] | null>(null);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);
  const minimum = 280;
  const gap = 16;
  const columns = Math.max(1, Math.floor(width / minimum));
  const itemWidth = columns > 0 ? (width - (columns - 1) * gap) / columns : 0;

  useEffect(() => {
    let cancelled = false;
    setContests(null);
    setError(false);

    Promise.all(
      TAB_STATES[tab].map((state) =>
        client.catalyst.v1.contest.search.get({ query: { state }, throwOnError: true }),
      ),
    )
      .then((results) => {
        if (!cancelled) setContests(results.flatMap((result) => result.data?.contests ?? []));
      })
      .catch((cause) => {
        console.error(cause);
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [client, tab]);

  if (error) {
    return (
      <EmptyState
        icon={<Trophy size={24} />}
        title="コンテストを読み込めませんでした"
        description="時間をおいて再度お試しください"
      />
    );
  }

  if (!contests) {
    return (
      <ScrollView className="flex-1">
        <View
          className="flex-row flex-wrap gap-4 p-5"
          onLayout={(event) => setWidth(event.nativeEvent.layout.width - 40)}
        >
          {width > 0 &&
            Array.from({ length: columns * 2 }, (_, index) => (
              <View key={index} style={{ width: itemWidth }}>
                <CardSkeleton />
              </View>
            ))}
        </View>
      </ScrollView>
    );
  }

  if (contests.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={24} />}
        title={EMPTY_TITLE[tab]}
        description="別のタブも見てみてください"
      />
    );
  }

  return (
    <ScrollView className="flex-1">
      <View
        className="flex-row flex-wrap gap-4 p-5"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width - 40)}
      >
        {width > 0 &&
          contests.map((contest) => (
            <View key={contest.slug} style={{ width: itemWidth }}>
              <ContestCard contest={contest} />
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const OpenContests = () => <ContestGrid tab="open" />;
const UpcomingContests = () => <ContestGrid tab="upcoming" />;
const ClosedContests = () => <ContestGrid tab="closed" />;

export const ContestsScreen = () => {
  const [Tabs] = useState(() => createTabNavigator<{ open: undefined; upcoming: undefined; closed: undefined }>());

  return (
    <Page
      wide
      rightRail={false}
      scroll={false}
      header={<PageHeader title="コンテスト" subtitle="テーマに沿った作品を投稿して参加しよう" />}
    >
      <Tabs.Navigator
        barStyle={{ backgroundColor: "transparent" }}
        barContentStyle={{ flexGrow: 1 }}
        contentStyle={{ backgroundColor: "transparent" }}
        screenOptions={{
          itemStyle: {
            flex: 1,
            margin: 0,
            padding: 0,
            borderWidth: 0,
            borderRadius: 0,
            backgroundColor: "transparent",
          },
          renderItemContent: ({ label, selected, hovered }: NavigationItemContentProps) => (
            <View className={cn("w-full items-center", hovered && "bg-light-surface dark:bg-dark-surface")}>
              <View className="h-11 justify-center">
                <Text
                  className={cn(
                    "text-[13px]",
                    selected
                      ? "font-bold text-light-text dark:text-dark-text"
                      : "font-medium text-light-text-muted dark:text-dark-text-muted",
                  )}
                >
                  {label}
                </Text>
              </View>
              <View
                className={cn(
                  "h-[3px] w-12 rounded-full",
                  selected ? "bg-light-accent dark:bg-dark-accent" : "bg-transparent",
                )}
              />
            </View>
          ),
        }}
      >
        <Tabs.Screen name="open" component={OpenContests} options={{ label: "開催中" }} />
        <Tabs.Screen name="upcoming" component={UpcomingContests} options={{ label: "開催予定" }} />
        <Tabs.Screen name="closed" component={ClosedContests} options={{ label: "終了" }} />
      </Tabs.Navigator>
    </Page>
  );
};
