import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import type { EgeriaUser } from "@/models/sdk-types";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniPlus = withUniwind(Plus);

type Props = {
  user: EgeriaUser;
  onPress: () => void;
};

export const FleetRingCreateItem = ({ user, onPress }: Props) => {
  const iconUrl = user.profile?.iconUrl
    ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 64 })
    : getIdenticonUrl(user.id);

  return (
    <Pressable onPress={onPress} className="mx-2 items-center">
      <View className="relative p-0.5">
        <UniImage
          source={{ uri: iconUrl }}
          className="h-13 w-13 rounded-full border-[2.5px] border-light-border dark:border-dark-border"
          contentFit="cover"
        />
        <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full bg-light-accent dark:bg-dark-accent">
          <UniPlus size={12} className="text-light-accent-foreground dark:text-dark-accent-foreground" />
        </View>
      </View>
      <Text
        className="mt-1 w-16 text-center text-xs text-light-text dark:text-dark-text"
        numberOfLines={1}
      >
        自分
      </Text>
    </Pressable>
  );
};
