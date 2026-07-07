import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystStatus, CatalystStatusV1_1 } from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import { Heart } from "lucide-react-native";
import { useCallback, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniHeart = withUniwind(Heart);

type Props = {
  isDefaultFavorited: boolean;
  status: CatalystStatus | CatalystStatusV1_1;
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
      setIsTogglingFavorite(false);
    }
  }, [account, client, status.id, isFavorited, isTogglingFavorite]);

  return (
    <View className="flex-row items-center px-1">
      <TouchableOpacity
        onPress={toggleFavorite}
        disabled={isTogglingFavorite || !isLoggedIn}
        className={cn("p-1", (!isLoggedIn || isTogglingFavorite) && "opacity-20")}
      >
        <UniHeart
          size={22}
          className={cn(isFavorited ? "text-[#FF3B30]" : "text-light-text-subtle dark:text-dark-text-subtle")}
          fill={isFavorited ? "#FF3B30" : "none"}
        />
      </TouchableOpacity>
    </View>
  );
};
