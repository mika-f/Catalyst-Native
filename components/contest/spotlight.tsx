import {
  CatalystButton,
  CatalystButtonText,
  CatalystDivider,
  CatalystIconButton,
  CatalystMediaFrame,
  CatalystSurface,
  CatalystText,
} from "@/components/design-system";
import { getCdnUrl } from "@/lib/media";
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
import { Pressable, View } from "react-native";
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
      <Pressable onPress={() => router.push(`/contest/${contest.slug}` as never)}>
        <CatalystMediaFrame className="h-24 w-28 rounded-lg">
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
        </CatalystMediaFrame>
      </Pressable>

      <View className="min-w-0 flex-1 justify-between gap-2">
        <View className="min-w-0 gap-1">
          <View className="flex-row items-center gap-1.5">
            <StateIcon state={state} />
            <CatalystText variant="caption" tone="muted" className="font-semibold">
              {STATE_LABELS[state]}
            </CatalystText>
            {remaining ? (
              <CatalystText variant="caption" tone="danger" className="font-semibold">
                {remaining}
              </CatalystText>
            ) : null}
          </View>
          <Pressable onPress={() => router.push(`/contest/${contest.slug}` as never)}>
            <CatalystText variant="label" numberOfLines={2}>
              {contest.title}
            </CatalystText>
          </Pressable>
          <CatalystText variant="caption" tone="muted" numberOfLines={1}>
            {getScheduleText(contest)}
          </CatalystText>
        </View>

        <View className="flex-row items-center justify-between gap-2">
          <CatalystText variant="caption" tone="subtle" className="min-w-0 flex-1" numberOfLines={1}>
            {contest.theme ? `テーマ: ${contest.theme}` : "フォトコンテスト"}
          </CatalystText>
          <CatalystButton
            size="sm"
            tone={isOpening && canCompose ? "primary" : "secondary"}
            className="min-h-8 rounded-md px-3"
            onPress={() => router.push(destination as never)}
          >
            <CatalystButtonText className="text-xs">{action}</CatalystButtonText>
          </CatalystButton>
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
    <CatalystSurface variant="muted" className="mx-3 my-3 overflow-hidden rounded-2xl">
      <View className="flex-row items-center justify-between gap-3 px-3 py-2.5">
        <View className="min-w-0">
          <CatalystText variant="caption" tone="muted" className="font-semibold uppercase">
            Photo Contest
          </CatalystText>
          <CatalystText variant="subtitle" numberOfLines={1}>
            開催中のフォトコンテスト
          </CatalystText>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable className="flex-row items-center gap-1 px-2 py-1" onPress={() => router.push("/contest" as never)}>
            <CatalystText tone="tint" className="font-semibold">一覧</CatalystText>
            <UniArrowRight size={16} className="text-light-tint dark:text-dark-tint" />
          </Pressable>
          <CatalystIconButton
            label="このコンテスト情報を非表示"
            size="sm"
            onPress={() => onDismiss?.(spotlight.slug)}
          >
            <UniX size={16} className="text-light-icon dark:text-dark-icon" />
          </CatalystIconButton>
        </View>
      </View>
      <CatalystDivider />

      <ContestSpotlightItem contest={spotlight} canCompose={!!credential.accessToken} />

      {rest.length > 0 ? (
        <>
          <CatalystDivider />
          <Pressable
            className="flex-row items-center justify-between px-3 py-3"
            onPress={() => router.push("/contest" as never)}
          >
            <CatalystText tone="muted">ほか{rest.length}件のコンテスト</CatalystText>
            <View className="flex-row items-center gap-1">
              <CatalystText tone="tint" className="font-semibold">
                一覧へ
              </CatalystText>
              <UniArrowRight size={16} className="text-light-tint dark:text-dark-tint" />
            </View>
          </Pressable>
        </>
      ) : null}
    </CatalystSurface>
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
  }, [client, setContests]);

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
