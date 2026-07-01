import type { CatalystStatusPrivacy } from "@natsuneko-laboratory/catalyst-sdk";
import { Lock, Users, VolumeX } from "lucide-react-native";
import { Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniLock = withUniwind(Lock);
const UniUsers = withUniwind(Users);
const UniVolumeX = withUniwind(VolumeX);

const CONFIG = {
  quiet_public: { icon: UniVolumeX, label: "静かに公開" },
  followers: { icon: UniUsers, label: "フォロワー" },
  private: { icon: UniLock, label: "非公開" },
} as const;

type Props = {
  privacy?: CatalystStatusPrivacy;
};

export const StatusVisibilityBadge = ({ privacy }: Props) => {
  if (!privacy || privacy === "public") return null;

  const { icon: Icon, label } = CONFIG[privacy];

  return (
    <View className="flex-row items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-full border border-light-border dark:border-dark-border shrink-0">
      <Icon size={11} className="text-light-text-muted dark:text-dark-text-muted" />
      <Text className="text-[10px] text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};
