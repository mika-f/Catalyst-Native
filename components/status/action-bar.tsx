import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus, CatalystStatusV1_1 } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import LottieView from 'lottie-react-native';
import { Heart, Repeat2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, useColorScheme, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";
import { Favorite, FavoriteFill } from "../svg/favorite";
import { Repost } from "../svg/repost";

const UniHeart = withUniwind(Heart);
const UniRepeat2 = withUniwind(Repeat2);

type Props = {
  isDefaultFavorited: boolean;
  isDefaultReposted: boolean;
  status: CatalystStatus | CatalystStatusV1_1;
};

type StatusRepostState = {
  visitor?: {
    repostable?: boolean;
  };
};

export const ActionBar = ({ isDefaultFavorited, isDefaultReposted, status }: Props) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const isLoggedIn = !!account?.user;
  const [isFavorited, setIsFavorited] = useState(isDefaultFavorited);
  const [isReposted, setIsReposted] = useState(isDefaultReposted);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState({ networking: false, animation: false });
  const [isTogglingRepost, setIsTogglingRepost] = useState({ networking: false, animation: false });
  const isRepostable = (status as StatusRepostState).visitor?.repostable ?? true;
  const theme = useColorScheme();
  const isDark = theme === "dark";
  const favoriteColor = isDark ? "#ff645f" : "#f14445";
  const repostColor = isDark ? "#34d399" : "#059669";

  const resetKey = `${status.id}:${isDefaultFavorited}:${isDefaultReposted}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setIsFavorited(isDefaultFavorited);
    setIsReposted(isDefaultReposted);
  }

  const toggleFavorite = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingFavorite.animation || isTogglingFavorite.networking) return;
    setIsTogglingFavorite({ networking: true, animation: !isFavorited });

    try {
      if (isFavorited) {
        await client.catalyst.v1.status.id.favorite.delete({ path: { id: status.id }, throwOnError: true });
        setIsFavorited(false);
      } else {
        await client.catalyst.v1.status.id.favorite.create({ path: { id: status.id }, throwOnError: true });
        setIsFavorited(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "お気に入りの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingFavorite(w => ({ ...w, networking: false }));
    }
  }, [account, client, status.id, isFavorited, isTogglingFavorite]);

  const toggleRepost = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingRepost.animation || isTogglingRepost.networking || !isRepostable) return;
    setIsTogglingRepost({ networking: true, animation: !isReposted });

    try {
      if (isReposted) {
        await client.catalyst.v1.status.id.repost.delete({ path: { id: status.id }, throwOnError: true });
        setIsReposted(false);
      } else {
        await client.catalyst.v1.status.id.repost.create({ path: { id: status.id }, throwOnError: true });
        setIsReposted(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "リポストの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingRepost((w) => ({ ...w, networking: false, }));
    }
  }, [account, client, status.id, isReposted, isRepostable, isTogglingRepost]);

  return (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorited ? "お気に入りを解除" : "お気に入りに追加"}
        onPress={toggleFavorite}
        disabled={isTogglingFavorite.animation || isTogglingFavorite.networking || !isLoggedIn}
        className={cn(
          "h-9 min-w-9 items-center justify-center rounded-full border border-light-border bg-light-surface px-2 active:opacity-75 dark:border-dark-border dark:bg-dark-surface-muted",
          isFavorited && "border-light-error bg-light-error-background dark:border-dark-error dark:bg-dark-error-background",
          (!isLoggedIn) && "opacity-30",
        )}
      >
        {isTogglingFavorite.animation ? <LottieView
          source={require("../../assets/images/ui/favorite-anim.lottie.json")}
          style={{ width: 24, height: 24 }} autoPlay loop={false}
          colorFilters={[
            {
              keypath: "heart-outline",
              color: favoriteColor,
            },
            {
              keypath: "heart-fill",
              color: favoriteColor,
            },
            {
              keypath: "particle-top",
              color: favoriteColor,
            },
            {
              keypath: "particle-left",
              color: favoriteColor,
            },
            {
              keypath: "particle-right",
              color: favoriteColor,
            },
          ]}
          onAnimationFinish={() => setIsTogglingFavorite((w) => ({ ...w, animation: false }))}
        /> : (<>
          {/* @ts-ignore */}
          {isFavorited ? <FavoriteFill style={{ color: favoriteColor }} /> : <Favorite style={{ color: isDark ? "#9ba1a6" : "#687076" }} />}
        </>)}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isReposted ? "リポストを取り消す" : "リポストする"}
        onPress={toggleRepost}
        disabled={isTogglingRepost.animation || isTogglingRepost.networking || !isLoggedIn || !isRepostable}
        className={cn(
          "ml-2 h-9 min-w-9 items-center justify-center rounded-full border border-light-border bg-light-surface px-2 active:opacity-75 dark:border-dark-border dark:bg-dark-surface-muted",
          isReposted && "border-light-tint bg-light-info-background dark:border-dark-tint dark:bg-dark-info-background",
          (!isLoggedIn || !isRepostable) && "opacity-30",
        )}
      >
        {isTogglingRepost.animation ? <LottieView
          source={require("../../assets/images/ui/repost-anim.lottie.json")}
          style={{ width: 24, height: 24 }} autoPlay loop={false}
          colorFilters={[
            {
              keypath: "repost-icon",
              color: repostColor,
            },
            {
              keypath: "particle-left",
              color: repostColor,
            },
            {
              keypath: "particle-right",
              color: repostColor,
            },
          ]}
          onAnimationFinish={() => setIsTogglingRepost((w) => ({ ...w, animation: false }))}
        /> : (<>
          {/* @ts-ignore */}
          {isReposted ? <Repost style={{ color: repostColor }} /> : <Repost style={{ color: isDark ? "#9ba1a6" : "#687076" }} />}
        </>)}
      </Pressable>
    </View>
  );
};
