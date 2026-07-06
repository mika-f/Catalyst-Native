import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { dismissContestSpotlight, getDismissedContestSpotlightIds } from "@/models/contest-spotlight";
import { clientAtom, credentialAtom } from "@/models/atoms/credential";
import { contestSpotlightAtom } from "@/models/atoms/contests";
import { Image } from "@/components/ui/image";
import type { CatalystContest } from "@natsuneko-laboratory/catalyst-sdk";
import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { useAtom, useAtomValue } from "jotai";
import { ArrowRight, CalendarDays, Camera, Trophy, Vote, X } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniArrowRight = withUniwind(ArrowRight);
const UniCalendarDays = withUniwind(CalendarDays);
const UniCamera = withUniwind(Camera);
const UniTrophy = withUniwind(Trophy);
const UniVote = withUniwind(Vote);
const UniX = withUniwind(X);

const TARGET_STATES = ["opening", "voting", "published"] as const;

const STATE_LABELS: Record<(typeof TARGET_STATES)[number], string> = {
  opening: "応募受付中",
  voting: "投票受付中",
  published: "開催前",
};

type SpotlightState = (typeof TARGET_STATES)[number];

const isSpotlightState = (state: string): state is SpotlightState => TARGET_STATES.includes(state as SpotlightState);

const sortContests = (contests: CatalystContest[]) => {
  const opening = contests.filter((contest) => contest.state === "opening");
  const voting = contests
    .filter((contest) => contest.state === "voting")
    .sort((a, b) => dayjs(a.voting.until).diff(dayjs(b.voting.until)));
  const published = contests
    .filter((contest) => contest.state === "published")
    .sort((a, b) => dayjs(a.since).diff(dayjs(b.since)));

  return [...opening, ...voting, ...published];
};

const getScheduleText = (contest: CatalystContest) => {
  if (contest.state === "published") {
    return `${dayjs(contest.since).format("M/D")} から応募開始`;
  }

  const until = contest.state === "voting" ? contest.voting.until : contest.until;
  const suffix = contest.state === "voting" ? "まで投票受付" : "まで応募受付";
  return `${dayjs(until).format("M/D")} ${suffix}`;
};

const getRemainingText = (contest: CatalystContest) => {
  if (contest.state !== "opening" && contest.state !== "voting") return null;

  const until = contest.state === "voting" ? contest.voting.until : contest.until;
  if (!dayjs(until).isBefore(dayjs().add(3, "days"))) return null;

  const remainingMinutes = Math.max(0, dayjs(until).diff(dayjs(), "minute"));
  const remainingHours = Math.max(0, dayjs(until).diff(dayjs(), "hour"));
  const remainingDays = Math.max(0, dayjs(until).diff(dayjs(), "day"));

  if (remainingHours < 1) return `あと${remainingMinutes}分`;
  if (remainingHours < 24) return `あと${remainingHours}時間`;
  return `あと${remainingDays}日`;
};

const StateIcon = ({ state }: { state: SpotlightState }) => {
  if (state === "published") {
    return <UniCalendarDays size={16} className="text-light-info dark:text-dark-info" />;
  }

  if (state === "voting") {
    return <UniVote size={16} className="text-light-warning dark:text-dark-warning" />;
  }

  return <UniCamera size={16} className="text-light-success dark:text-dark-success" />;
};

type ContestSpotlightItemProps = {
  contest: CatalystContest;
  canCompose: boolean;
};

const ContestSpotlightItem = memo(({ contest, canCompose }: ContestSpotlightItemProps) => {
  const router = useRouter();
  const state = isSpotlightState(contest.state) ? contest.state : "opening";
  const isOpening = state === "opening";
  const destination =
    isOpening && canCompose ? `/compose/post?contest=${encodeURIComponent(contest.slug)}` : `/contest/${contest.slug}`;
  const action = isOpening && canCompose ? "応募する" : state === "voting" ? "投票へ" : "概要を見る";
  const remaining = getRemainingText(contest);

  return (
    <View className="flex-row gap-3 p-3">
      <Pressable
        className="h-24 w-28 overflow-hidden rounded-md bg-light-surface-muted dark:bg-dark-surface-muted"
        onPress={() => router.push(`/contest/${contest.slug}` as never)}
      >
        {contest.headerUrl ? (
          <Image
            source={{ uri: getCdnUrl({ src: contest.headerUrl, variant: "header", width: 512 }) }}
            className="h-full w-full"
            contentFit="cover"
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <UniTrophy size={28} className="text-light-text-subtle dark:text-dark-text-subtle" />
          </View>
        )}
      </Pressable>

      <View className="min-w-0 flex-1 justify-between gap-2">
        <View className="min-w-0 gap-1">
          <View className="flex-row items-center gap-1.5">
            <StateIcon state={state} />
            <Text className="text-xs font-semibold text-light-text-muted dark:text-dark-text-muted">
              {STATE_LABELS[state]}
            </Text>
            {remaining ? (
              <Text className="text-xs font-semibold text-light-error dark:text-dark-error">{remaining}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => router.push(`/contest/${contest.slug}` as never)}>
            <Text className="text-sm font-bold text-light-text dark:text-dark-text" numberOfLines={2}>
              {contest.title}
            </Text>
          </Pressable>
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
            {getScheduleText(contest)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 text-xs text-light-text-subtle dark:text-dark-text-subtle" numberOfLines={1}>
            {contest.theme ? `テーマ: ${contest.theme}` : "フォトコンテスト"}
          </Text>
          <Pressable
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5",
              isOpening && canCompose
                ? "bg-light-accent dark:bg-dark-accent"
                : "border border-light-border dark:border-dark-border",
            )}
            onPress={() => router.push(destination as never)}
          >
            <Text
              className={cn(
                "text-xs font-semibold",
                isOpening && canCompose
                  ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                  : "text-light-text dark:text-dark-text",
              )}
            >
              {action}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

ContestSpotlightItem.displayName = "ContestSpotlightItem";

type ContestSpotlightProps = {
  contests: CatalystContest[];
  onDismiss?: (id: string) => void;
};

export const ContestSpotlight = memo(({ contests, onDismiss }: ContestSpotlightProps) => {
  const router = useRouter();
  const credential = useAtomValue(credentialAtom);
  const items = useMemo(() => sortContests(contests.filter((contest) => isSpotlightState(contest.state))), [contests]);
  const [spotlight, ...rest] = items;

  if (!spotlight) return null;

  return (
    <View className="mx-3 my-3 overflow-hidden rounded-lg border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface">
      <View className="flex-row items-center justify-between gap-3 border-b border-light-divider px-3 py-2.5 dark:border-dark-divider">
        <View className="min-w-0">
          <Text className="text-xs font-semibold uppercase text-light-text-muted dark:text-dark-text-muted">
            Photo Contest
          </Text>
          <Text className="text-base font-bold text-light-text dark:text-dark-text" numberOfLines={1}>
            開催中のフォトコンテスト
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable className="flex-row items-center gap-1 px-2 py-1" onPress={() => router.push("/contest" as never)}>
            <Text className="text-sm font-semibold text-light-tint dark:text-dark-tint">一覧</Text>
            <UniArrowRight size={16} className="text-light-tint dark:text-dark-tint" />
          </Pressable>
          <Pressable
            className="h-8 w-8 items-center justify-center rounded-full active:bg-light-surface-muted dark:active:bg-dark-surface-muted"
            onPress={() => onDismiss?.(spotlight.slug)}
            accessibilityLabel="このコンテスト情報を非表示"
          >
            <UniX size={16} className="text-light-icon dark:text-dark-icon" />
          </Pressable>
        </View>
      </View>

      <ContestSpotlightItem contest={spotlight} canCompose={!!credential.accessToken} />

      {rest.length > 0 ? (
        <Pressable
          className="flex-row items-center justify-between border-t border-light-divider px-3 py-3 dark:border-dark-divider"
          onPress={() => router.push("/contest" as never)}
        >
          <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
            ほか{rest.length}件のコンテスト
          </Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-semibold text-light-tint dark:text-dark-tint">一覧へ</Text>
            <UniArrowRight size={16} className="text-light-tint dark:text-dark-tint" />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
});

ContestSpotlight.displayName = "ContestSpotlight";

export const CurrentContestSpotlight = memo(() => {
  const client = useAtomValue(clientAtom);
  const [contests, setContests] = useAtom(contestSpotlightAtom);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;

    getDismissedContestSpotlightIds()
      .then((ids) => {
        if (!ignore) {
          setDismissedIds(ids);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchContests = async () => {
      if (!client) {
        setContests([]);
        return;
      }

      const results = await Promise.all(TARGET_STATES.map((state) => client.catalyst.searchContests(undefined, state)));
      if (!ignore) {
        setContests(sortContests(results.flat()));
      }
    };

    fetchContests().catch(() => {
      if (!ignore) {
        setContests([]);
      }
    });

    return () => {
      ignore = true;
    };
  }, [client]);

  const visibleContests = useMemo(
    () => contests.filter((contest) => !dismissedIds.has(contest.slug)),
    [contests, dismissedIds],
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      setDismissedIds((prev) => new Set(prev).add(id));
      const ids = await dismissContestSpotlight(id);
      setDismissedIds(ids);
    },
    [],
  );

  return <ContestSpotlight contests={visibleContests} onDismiss={handleDismiss} />;
});

CurrentContestSpotlight.displayName = "CurrentContestSpotlight";
