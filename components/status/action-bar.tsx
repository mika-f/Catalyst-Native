import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystStatus } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { Heart } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniHeart = withUniwind(Heart);

type Props = {
  isDefaultFavorited: boolean;
  status: CatalystStatus;
};

export const ActionBar = ({ isDefaultFavorited, status }: Props) => {
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const isLoggedIn = !!account?.user;
  const [isFavorited, setIsFavorited] = useState(isDefaultFavorited);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const toggleFavorite = useCallback(async () => {
    if (!account?.credential.client || !status.id || isTogglingFavorite) return;
    setIsTogglingFavorite(true);

    try {
      if (isFavorited) {
        await client.catalyst.unfavorite(status.id);
        setIsFavorited(false);
      } else {
        await client.catalyst.favorite(status.id);
        setIsFavorited(true);
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "エラー", text2: "お気に入りの操作に失敗しました" });
      console.error(e);
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [account, client, status.id, isFavorited, isTogglingFavorite]);

  return (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorited ? "お気に入りを解除" : "お気に入りに追加"}
        onPress={toggleFavorite}
        disabled={isTogglingFavorite || !isLoggedIn}
        className={cn(
          "h-9 min-w-9 items-center justify-center rounded-full border border-light-border bg-light-surface px-2 active:opacity-75 dark:border-dark-border dark:bg-dark-surface-muted",
          isFavorited && "border-light-error bg-light-error-background dark:border-dark-error dark:bg-dark-error-background",
          (!isLoggedIn || isTogglingFavorite) && "opacity-30",
        )}
      >
        <UniHeart
          size={20}
          className={cn(isFavorited ? "text-light-error dark:text-dark-error" : "text-light-icon dark:text-dark-icon")}
          fill={isFavorited ? "#FF3B30" : "none"}
        />
      </Pressable>
    </View>
  );
};
