// oxlint-disable react-native/no-inline-styles react-native/no-color-literals
import { clientAtom } from "@/atoms/credential";
import { Page, PageHeader } from "@/components/page";
import { TabItemContent } from "@/components/ui";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { useHover } from "@/hooks/use-hover";
import { useContainerWidth } from "@/layout/breakpoints";
import * as ArrayUtils from "@/lib/array";
import { getColumnCount, getColumnWidth } from "@/lib/column";
import { getCdnUrl } from "@/models/cdn";
import { CatalystWeeklyTheme } from "@/models/sdk-types";
import { createTabNavigator, NavigationItemContentProps } from "@natsuneko-laboratory/react-native-desktop-navigation";
import { FlashList } from "@shopify/flash-list";
import { cn } from "cn";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { Calendar } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniCalendar = withUniwind(Calendar);

const ThemeCell = ({ item: theme, width, }: { item: CatalystWeeklyTheme; width: number; }) => {
  const { hovered, hoverProps } = useHover();
  const hasBanner = !!theme.bannerUrl;
  const remainingDays = Math.max(0, dayjs(theme.until).diff(dayjs(), "day") + 1);

  return <Pressable {...hoverProps} >
    <View className={cn("flex gap-2 bg-light-surface pb-2 dark:bg-dark-surface", hovered && "bg-light-surface-elevated dark:bg-dark-surface-elevated")} style={{ marginHorizontal: 2, marginVertical: 2 }}>
      <View className="overflow-hidden rounded-sm">
        {hasBanner ? <Image source={{ uri: getCdnUrl({ src: theme.bannerUrl!, variant: "header", width: 150 }) }} width={width} height={width / 3} /> : <View className="flex h-full w-full items-center justify-center bg-light-surface-muted dark:bg-dark-surface-muted" style={{ width, height: width / 3 }}>
          <UniCalendar className="text-light-text-subtle dark:text-dark-text-subtle" />
        </View>}
      </View>

      <View className="flex flex-col gap-2 p-2">
        <View className="flex flex-row justify-between">
          <Text>{theme.title}</Text>
          <Text>{theme.weekKey}</Text>
        </View>
        <View>
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
            {theme.state === "open" ? `残り${remainingDays}日・${theme.statusCount}件の投稿` : `終了・${theme.statusCount}件の投稿`}
          </Text>
        </View>
      </View>
    </View>
  </Pressable>
};

type PeriodicThemeScreenProps = {
  type: "current" | "past"
};

const PeriodicThemeScreen = ({ type }: PeriodicThemeScreenProps) => {
  const client = useAtomValue(clientAtom);
  const container = useContainerWidth();
  const [themes, setThemes] = useState<CatalystWeeklyTheme[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sets = useRef<Set<string>>(new Set());
  const columns = useMemo(() => getColumnCount(container.width, 300, 400), [container.width]);
  const width = useMemo(() => getColumnWidth(container.width, 300, 400), [container.width]);

  const fetchThemes = useCallback(async (cursor: string | null) => {
    setIsLoading(true);

    try {
      if (type === "current") {
        const { data } = await client.catalyst.v1.weeklyThemes.current.get({ throwOnError: true });
        setThemes(data.theme ? [data.theme] : []);
      } else {
        const { data } = await client.catalyst.v1.weeklyThemes.get({ query: { cursor: cursor ?? undefined, state: "closed" } });
        setThemes((prev) => ArrayUtils.merge(prev, data?.themes ?? [], sets, (item) => item.slug));
        setCursor(data?.nextCursor ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, type]);

  useAsyncOneTimeEffect(() => fetchThemes(null));

  return <View className="flex-1">
    <FlashList
      data={themes}
      keyExtractor={(slot) => slot.slug}
      renderItem={({ item }) => <ThemeCell item={item} width={width} />}
      numColumns={columns}
      onLayout={container.onLayout}
    />
  </View>;
};

export const ThemesScreen = () => {
  const [Tabs] = useState(() => createTabNavigator<{ [keys in "current" | "past"]: undefined }>());

  return <Page wide rightRail={false} scroll={false} header={<PageHeader title="お題" subtitle="毎週月曜日に出題される撮影テーマです。参加するとポイントが貯まり、クーポンと交換できます。" />}>
    <Tabs.Navigator barStyle={{ backgroundColor: "transparent", paddingHorizontal: 12 }}
      contentStyle={{ backgroundColor: "transparent" }}
      screenOptions={{
        // 他画面の SegmentedTabs (components/ui.tsx) と見た目を揃える: 左寄せの SelectorBar 風
        itemStyle: {
          margin: 0,
          padding: 0,
          borderWidth: 0,
          borderRadius: 0,
          // ライブラリ側が選択時に colors.selectedBackground を既定で敷くため、下線のみの見た目にするには打ち消す必要がある
          backgroundColor: "transparent",
        },
        renderItemContent: ({ label, selected, hovered }: NavigationItemContentProps) => (
          <TabItemContent label={label} selected={selected} hovered={hovered} />
        ),
      }}>
      <Tabs.Screen name="current" component={(props) => <PeriodicThemeScreen {...props} type="current" />} options={{ label: "今週のお題" }} />
      <Tabs.Screen name="past" component={(props) => <PeriodicThemeScreen {...props} type="past" />} options={{ label: "過去のお題" }} />
    </Tabs.Navigator>
  </Page>
};