import { CircleAlert, Image, ListFilter, LogIn, Smile } from "lucide-react-native";
import { boostTextContrastAtom } from "@/atoms/accessibility";
import { accountAtom } from "@/atoms/account";
import { clientAtom } from "@/atoms/credential";
import { hideSensitiveContentAtom } from "@/atoms/sensitive-content";
import type { CatalystStatusV1_2 } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { TimelineSkeleton } from "../components/status-skeleton";
import { Avatar, Button, Divider, EmptyState, IconButton, SegmentedTabs, type SegmentedTab } from "../components/ui";

const UniImage = withUniwind(Image);
const UniSmile = withUniwind(Smile);
const UniListFilter = withUniwind(ListFilter);

type Timeline = "recommended" | "following";

const TIMELINES: SegmentedTab<Timeline>[] = [
  { key: "recommended", label: "おすすめ" },
  { key: "following", label: "フォロー中" },
];

// タイムライン先頭のインライン投稿欄
const Composer = () => {
  return (
    <View>
      <View className="flex-row gap-3 px-5 py-4">
        <Avatar />
        <View className="flex-1 gap-3">
          <Pressable accessibilityRole="button" focusable className="min-h-10 justify-center">
            <Text className="text-lg text-light-text-subtle dark:text-dark-text-subtle">いまどうしてる？</Text>
          </Pressable>
          <Divider />
          <View className="flex-row items-center">
            <IconButton label="画像を追加">
              <UniImage size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <IconButton label="絵文字を追加">
              <UniSmile size={18} className="text-light-link dark:text-dark-link" />
            </IconButton>
            <View className="flex-1" />
            <Button label="投稿" disabled />
          </View>
        </View>
      </View>
      <Divider />
    </View>
  );
};

const StatusRow = ({ status }: { status: CatalystStatusV1_2 }) => {
  const boostContrast = useAtomValue(boostTextContrastAtom);

  return (
    <View>
      <View className="flex-row gap-3 px-5 py-4">
        <Avatar name={status.user?.displayName ?? "?"} />
        <View className="flex-1 gap-1">
          <Text
            numberOfLines={1}
            className={
              boostContrast
                ? "text-[13px] text-light-text dark:text-dark-text"
                : "text-[13px] text-light-text-muted dark:text-dark-text-muted"
            }
          >
            <Text className="font-semibold text-light-text dark:text-dark-text">{status.user?.displayName}</Text>
            {` @${status.user?.screenName}`}
          </Text>
          <Text selectable className="text-[15px] text-light-text dark:text-dark-text">
            {status.body}
          </Text>
        </View>
      </View>
      <Divider />
    </View>
  );
};

// ホーム TL (フォロー中)。ログイン中のみ読み込む
const HomeTimeline = () => {
  const client = useAtomValue(clientAtom);
  const hideSensitiveContent = useAtomValue(hideSensitiveContentAtom);
  const [statuses, setStatuses] = useState<CatalystStatusV1_2[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setStatuses(null);
    client.catalyst.v12.timeline.home
      .get({
        query: hideSensitiveContent ? { exclude_sensitive: true } : {},
        throwOnError: true,
      })
      .then(({ data }) => !cancelled && setStatuses(data ?? []))
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [client, hideSensitiveContent]);

  if (error) return <EmptyState icon={<CircleAlert size={24} />} title="タイムラインを読み込めませんでした" description="時間をおいて再度お試しください" />;
  if (!statuses) return <TimelineSkeleton />;
  return statuses.map((s) => <StatusRow key={s.id} status={s} />);
};

export const HomeScreen = () => {
  const isLoggedIn = useAtomValue(accountAtom) !== null;
  const [timeline, setTimeline] = useState<Timeline>("recommended");

  return (
    <Page
      header={
        <PageHeader
          title="ホーム"
          actions={
            <IconButton label="表示設定">
              <UniListFilter size={18} className="text-light-icon dark:text-dark-icon" />
            </IconButton>
          }
        >
          <SegmentedTabs tabs={TIMELINES} value={timeline} onChange={setTimeline} />
        </PageHeader>
      }
    >
      {isLoggedIn ? (
        <>
          <Composer />
          <HomeTimeline />
        </>
      ) : (
        <EmptyState icon={<LogIn size={24} />} title="ログインしていません" description="サイドバーの「ログイン」からサインインしてください" />
      )}
    </Page>
  );
};
