import { getCdnUrl } from "@/lib/media";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import type { EgeriaUser } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniChevronRight = withUniwind(ChevronRight);

type Props = {
  user: EgeriaUser;
};

export const UserCard = ({ user }: Props) => {
  const router = useRouter();

  return (
    <Pressable
      className="flex-row items-center gap-3 p-3 m-2 bg-light-surface dark:bg-dark-surface rounded-xl"
      onPress={() => router.push(`/user/${user.screenName}`)}
    >
      {/* アイコン画像 */}
      {user.profile ? (
        <UniImage
          source={{
            uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }),
          }}
          className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800"
          contentFit="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800" />
      )}

      {/* ユーザー情報 */}
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-1">
          <Text className="shrink text-base font-bold text-neutral-900 dark:text-neutral-100" numberOfLines={1}>
            {user.displayName}
          </Text>
          <ProfileEmoji emoji={user.profileEmoji} size={16} />
        </View>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={1}>
          @{user.screenName}
        </Text>
        {user.profile && user.profile.bio.length > 0 && (
          <Text className="text-xs text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
            {user.profile.bio}
          </Text>
        )}
      </View>

      {/* 矢印アイコン */}
      <UniChevronRight size={14} className="text-neutral-400 dark:text-neutral-500" />
    </Pressable>
  );
};
