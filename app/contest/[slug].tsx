import { TimelineBase } from "@/components/timeline/base";
import { TimelineStatus } from "@/components/timeline/status";
import { Markdown } from "@/components/ui/markdown";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { abs } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { clientAtom } from "@/models/atoms/credential";
import type {
  CatalystContest,
  CatalystContestAward,
  CatalystStatus,
} from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ArrowLeft, FileQuestion, ThumbsUp, Trophy } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniImage = withUniwind(Image);
const UniTrophy = withUniwind(Trophy);
const UniFileQuestion = withUniwind(FileQuestion);
const UniArrowLeft = withUniwind(ArrowLeft);
const UniThumbsUp = withUniwind(ThumbsUp);

const STATE_LABEL: Record<string, string> = {
  opening: "作品受付中",
  voting: "投票受付中",
  closing: "投票準備中",
  electing: "結果準備中",
  published: "開催予定",
  closed: "終了",
};

const fmt = (d: string) => abs(d);

const InfoRow = ({
  label,
  noBorder,
  children,
}: {
  label: string;
  noBorder?: boolean;
  children: React.ReactNode;
}) => (
  <View
    className={cn(
      "flex-row py-3",
      !noBorder && "border-b border-light-divider dark:border-dark-divider",
    )}
  >
    <Text className="text-sm font-semibold text-light-text dark:text-dark-text w-28 shrink-0">
      {label}
    </Text>
    <View className="flex-1">{children}</View>
  </View>
);

const InfoText = ({ value }: { value: string }) => (
  <Text className="text-sm text-light-text dark:text-dark-text">{value}</Text>
);

type WinnerStatus = CatalystStatus & {
  message?: string | null;
  commentary?: string | null;
};

const AwardWinnerCard = ({ status }: { status: WinnerStatus }) => {
  const router = useRouter();
  const firstMedia = status.medias?.[0];
  const user = status.user;

  return (
    <Pressable
      className="flex-row gap-3 p-3 border-b border-light-divider dark:border-dark-divider"
      onPress={() => router.push(`/status/${status.id}` as never)}
    >
      {/* サムネイル */}
      <View className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
        {firstMedia ? (
          <UniImage
            source={{
              uri: getCdnUrl({
                src: firstMedia.url,
                variant: "thumbnail",
                width: 256,
              }),
            }}
            className="w-full h-full"
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <UniTrophy size={24} className="text-neutral-400" />
          </View>
        )}
      </View>

      {/* テキスト情報 */}
      <View className="flex-1 gap-1">
        {/* 投稿者 */}
        <View className="flex-row items-center gap-1.5">
          {user?.profile?.iconUrl ? (
            <UniImage
              source={{
                uri: getCdnUrl({
                  src: user.profile.iconUrl,
                  variant: "icon",
                  width: 64,
                }),
              }}
              className="w-5 h-5 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          )}
          <Text
            className="text-xs font-semibold text-light-text dark:text-dark-text"
            numberOfLines={1}
          >
            {user?.displayName}
          </Text>
          <Text
            className="text-xs text-light-text-muted dark:text-dark-text-muted"
            numberOfLines={1}
          >
            @{user?.screenName}
          </Text>
        </View>

        {/* 本文 */}
        {status.body?.length > 0 && (
          <Text
            className="text-sm text-light-text dark:text-dark-text"
            numberOfLines={3}
          >
            {status.body}
          </Text>
        )}

        {/* 主催者コメント */}
        {status.commentary && (
          <View className="mt-1 pl-2 border-l-2 border-light-accent dark:border-dark-accent">
            <Text
              className="text-xs text-light-text-muted dark:text-dark-text-muted"
              numberOfLines={2}
            >
              {status.commentary}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const AwardSection = ({ award }: { award: CatalystContestAward }) => (
  <View className="mb-2">
    {/* 賞名ヘッダー */}
    <View className="flex-row items-center gap-2 px-4 py-3 bg-light-surface dark:bg-dark-surface">
      <UniTrophy
        size={16}
        className="text-light-accent dark:text-dark-accent"
      />
      <Text className="flex-1 text-base font-bold text-light-text dark:text-dark-text">
        {award.name}
      </Text>
      <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
        {award.winners.length}作品
      </Text>
    </View>

    {/* 受賞作品リスト */}
    {award.winners.length === 0 ? (
      <View className="px-4 py-3">
        <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
          受賞作品はありません
        </Text>
      </View>
    ) : (
      (award.winners as unknown as WinnerStatus[]).map((winner) => (
        <AwardWinnerCard key={winner.id} status={winner} />
      ))
    )}
  </View>
);

type HeaderProps = {
  contest: CatalystContest;
  awards: CatalystContestAward[];
  voteRights?: VoteRights | null;
};

const ContestHeader = ({ contest, awards, voteRights }: HeaderProps) => {
  const { width: screenWidth } = useWindowDimensions();
  const terms = contest.terms
    ? contest.terms
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  const imageHeight = screenWidth / 3; // 1500:500 = 3:1

  return (
    <View className="bg-light-background dark:bg-dark-background">
      <View style={{ aspectRatio: 3 / 1 }}>
        {contest.headerUrl ? (
          <UniImage
            source={{
              uri: getCdnUrl({
                src: contest.headerUrl,
                variant: "header",
                width: 1500,
              }),
            }}
            style={{ width: "100%", height: imageHeight }}
            contentFit="cover"
          />
        ) : (
          <View
            className="w-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center"
            style={{ height: imageHeight }}
          >
            <UniTrophy size={56} className="text-neutral-400" />
          </View>
        )}
      </View>

      {/* タイトル・状態 */}
      <View className="px-4 pt-4 pb-2 gap-2">
        <View
          className={cn(
            "self-start px-2.5 py-1 rounded-full",
            contest.state === "opening" &&
              "bg-light-success-background dark:bg-dark-success-background",
            contest.state === "voting" &&
              "bg-light-info-background dark:bg-dark-info-background",
            (contest.state === "closing" || contest.state === "electing") &&
              "bg-light-warning-background dark:bg-dark-warning-background",
            (contest.state === "published" || contest.state === "closed") &&
              "bg-light-surface-muted dark:bg-dark-surface-muted",
          )}
        >
          <Text
            className={cn(
              "text-xs font-semibold",
              contest.state === "opening" &&
                "text-light-success-foreground dark:text-dark-success-foreground",
              contest.state === "voting" &&
                "text-light-info-foreground dark:text-dark-info-foreground",
              (contest.state === "closing" || contest.state === "electing") &&
                "text-light-warning-foreground dark:text-dark-warning-foreground",
              (contest.state === "published" || contest.state === "closed") &&
                "text-light-text-muted dark:text-dark-text-muted",
            )}
          >
            {STATE_LABEL[contest.state] ?? contest.state}
          </Text>
        </View>

        <Text className="text-xl font-bold text-light-text dark:text-dark-text">
          {contest.title}
        </Text>

        {contest.description?.length > 0 && (
          <Markdown body={contest.description} />
        )}
      </View>

      {/* 投票権バナー */}
      {contest.state === "voting" && contest.voting?.isEnable && voteRights && (
        <View className="mx-4 mb-2 px-4 py-2.5 bg-light-info-background dark:bg-dark-info-background rounded-xl flex-row items-center gap-2">
          <UniThumbsUp
            size={14}
            className="text-light-info dark:text-dark-info"
          />
          <Text className="flex-1 text-sm text-light-info-foreground dark:text-dark-info-foreground">
            残り {voteRights.remaining} / {contest.voting.maxVotes}{" "}
            票を投票できます
          </Text>
        </View>
      )}

      {/* 応募要項 */}
      <View className="mx-4 mb-4 mt-2 bg-light-surface dark:bg-dark-surface rounded-xl px-4">
        <Text className="text-base font-bold text-light-text dark:text-dark-text pt-4 pb-2">
          応募要項
        </Text>

        <InfoRow label="応募期間">
          <InfoText value={`${fmt(contest.since)} ～ ${fmt(contest.until)}`} />
        </InfoRow>

        {contest.theme?.length > 0 && (
          <InfoRow label="テーマ">
            <InfoText value={contest.theme} />
          </InfoRow>
        )}

        {contest.winnersOpenAt && (
          <InfoRow label="結果発表目安">
            <InfoText value={fmt(contest.winnersOpenAt)} />
          </InfoRow>
        )}

        <InfoRow label="審査方法">
          <View className="gap-1">
            <InfoText value="審査員選択" />
            {contest.voting?.isEnable && (
              <InfoText
                value={`ユーザー投票あり（1人${contest.voting.maxVotes}票まで）`}
              />
            )}
          </View>
        </InfoRow>

        {contest.voting?.isEnable && (
          <InfoRow label="投票期間">
            <InfoText
              value={`${fmt(contest.voting.since)} ～ ${fmt(contest.voting.until)}`}
            />
          </InfoRow>
        )}

        <InfoRow label="賞">
          {contest.ranks.length === 0 ? (
            <InfoText value="賞は設定されていません" />
          ) : (
            <View className="gap-3">
              {contest.ranks.map((rank) => (
                <View key={rank.id}>
                  <Text className="text-sm font-semibold text-light-text dark:text-dark-text">
                    {rank.name}
                  </Text>
                  {rank.description && (
                    <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                      {rank.description}
                    </Text>
                  )}
                  {rank.prize.length > 0 && (
                    <View>
                      <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                        賞品:
                      </Text>
                      <Text className="text-xs text-light-text-muted dark:text-dark-text-muted mt-0.5">
                        {rank.prize}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </InfoRow>

        <InfoRow label="応募規定" noBorder>
          <View className="gap-1">
            {terms.length ? (
              terms.map((term, i) => (
                <Text
                  key={`${i}-${term}`}
                  className="text-sm text-light-text dark:text-dark-text"
                >
                  · {term}
                </Text>
              ))
            ) : (
              <Text className="text-sm text-light-text dark:text-dark-text">
                応募規定はありません
              </Text>
            )}
          </View>
        </InfoRow>

        <View className="pb-4" />
      </View>

      {/* 受賞作品一覧（終了コンテストのみ） */}
      {contest.state === "closed" && awards.length > 0 && (
        <View className="mb-4">
          <View className="px-4 pb-2 border-b border-light-divider dark:border-dark-divider mb-2">
            <Text className="text-base font-bold text-light-text dark:text-dark-text">
              受賞作品一覧
            </Text>
          </View>
          {awards.map((award) => (
            <AwardSection key={award.id} award={award} />
          ))}
        </View>
      )}

      {/* タイムラインタイトル */}
      <View className="px-4 pb-2 border-b border-light-divider dark:border-dark-divider">
        <Text className="text-base font-bold text-light-text dark:text-dark-text">
          投稿作品一覧
        </Text>
      </View>
    </View>
  );
};

type VoteRights = {
  remaining: number;
  statuses: string[];
};

type VoteButtonProps = {
  statusId: string;
  voteRights: VoteRights;
  onVote: (id: string) => void;
  onUnvote: (id: string) => void;
};

const VoteButton = ({
  statusId,
  voteRights,
  onVote,
  onUnvote,
}: VoteButtonProps) => {
  const isVoted = voteRights.statuses.includes(statusId);
  const canVote = isVoted || voteRights.remaining > 0;

  return (
    <View className="px-4 pb-2 flex-row justify-end">
      <Pressable
        onPress={() => (isVoted ? onUnvote(statusId) : onVote(statusId))}
        disabled={!canVote}
        className={cn(
          "flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border",
          isVoted
            ? "border-light-toggle-border dark:border-dark-toggle-border bg-light-toggle dark:bg-dark-toggle"
            : canVote
              ? "border-light-border dark:border-dark-border"
              : "border-light-border dark:border-dark-border opacity-40",
        )}
      >
        <UniThumbsUp
          size={14}
          className={cn(
            isVoted
              ? "text-light-toggle-icon dark:text-dark-toggle-icon"
              : "text-light-icon dark:text-dark-icon",
          )}
        />
        <Text
          className={cn(
            "text-xs font-medium",
            isVoted
              ? "text-light-toggle-foreground dark:text-dark-toggle-foreground"
              : "text-light-text-muted dark:text-dark-text-muted",
          )}
        >
          {isVoted ? "投票済み" : "投票する"}
        </Text>
      </Pressable>
    </View>
  );
};

export default function ContestDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const client = useAtomValue(clientAtom);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [contest, setContest] = useState<CatalystContest | null>(null);
  const [awards, setAwards] = useState<CatalystContestAward[]>([]);
  const [isNotFound, setIsNotFound] = useState(false);
  const [voteRights, setVoteRights] = useState<VoteRights | null>(null);

  useAsyncOneTimeEffect(async () => {
    if (!client || !slug) return;
    try {
      const res = await client.catalyst.getContestBySlug(slug);
      setContest(res.contest);

      if (res.contest.state === "closed") {
        const awardsRes = await client.catalyst.getContestAwards(slug);
        setAwards(awardsRes.awards);
      }

      if (res.contest.state === "voting" && res.contest.voting?.isEnable) {
        try {
          const rights = await client.catalyst.getContestVotes(slug);
          setVoteRights(rights);
        } catch {
          // 投票権情報の取得失敗はコンテスト表示自体には影響しない
        }
      }
    } catch {
      setIsNotFound(true);
    }
  });

  const handleVote = useCallback(
    async (statusId: string) => {
      if (!client || !slug) return;
      try {
        await client.catalyst.addContestVoteToStatus(slug, statusId);
        setVoteRights((prev) =>
          prev
            ? {
                remaining: prev.remaining - 1,
                statuses: [...prev.statuses, statusId],
              }
            : prev,
        );
      } catch {
        Alert.alert("エラー", "投票に失敗しました");
      }
    },
    [client, slug],
  );

  const handleUnvote = useCallback(
    async (statusId: string) => {
      if (!client || !slug) return;
      try {
        await client.catalyst.removeContestVoteFromStatus(slug, statusId);
        setVoteRights((prev) =>
          prev
            ? {
                remaining: prev.remaining + 1,
                statuses: prev.statuses.filter((id) => id !== statusId),
              }
            : prev,
        );
      } catch {
        Alert.alert("エラー", "投票の取り消しに失敗しました");
      }
    },
    [client, slug],
  );

  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (
          await client?.catalyst.contestTimeline(slug, {
            since: since ?? undefined,
            until: until ?? undefined,
          })
        )?.statuses ?? []
      );
    },
    [client, slug],
  );

  const renderItem = useCallback(
    ({ item }: { item: CatalystStatus }) => (
      <View>
        <TimelineStatus status={item} />
        {voteRights && (
          <VoteButton
            statusId={item.id}
            voteRights={voteRights}
            onVote={handleVote}
            onUnvote={handleUnvote}
          />
        )}
      </View>
    ),
    [voteRights, handleVote, handleUnvote],
  );

  const Header = useCallback(
    () =>
      contest ? (
        <ContestHeader
          contest={contest}
          awards={awards}
          voteRights={voteRights}
        />
      ) : null,
    [contest, awards, voteRights],
  );

  const renderContent = () => {
    if (isNotFound) {
      return (
        <View className="flex-1 items-center justify-center">
          <UniFileQuestion
            size={64}
            className="text-light-gray dark:text-dark-gray"
          />
          <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
            コンテストが見つかりません
          </Text>
          <Text className="text-sm text-light-gray dark:text-dark-gray mt-2 text-center">
            削除されたか、アクセスできないコンテンツです
          </Text>
        </View>
      );
    }

    if (!contest) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      );
    }

    return (
      <TimelineBase
        fetcher={fetcher}
        renderItem={voteRights ? renderItem : undefined}
        ListHeaderComponent={Header}
      />
    );
  };

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {renderContent()}

      {/* 戻るボタンオーバーレイ */}
      <View
        className="absolute left-0 right-0 top-0"
        style={{ paddingTop: insets.top }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          className="p-2 m-2 self-start"
          onPress={() => router.back()}
        >
          <View className="w-9 h-9 rounded-full bg-black/75 items-center justify-center">
            <UniArrowLeft size={18} className="text-white" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
