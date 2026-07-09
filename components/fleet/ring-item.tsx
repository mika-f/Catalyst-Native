import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { CatalystFleetRing } from "@/models/sdk-types";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type Props = {
  ring: CatalystFleetRing;
  onPress: () => void;
};

export const FleetRingItem = ({ ring, onPress }: Props) => {
  const iconUrl = ring.user.profile?.iconUrl
    ? getCdnUrl({ src: ring.user.profile.iconUrl, variant: "icon", width: 64 })
    : getIdenticonUrl(ring.user.id);

  return (
    <Pressable onPress={onPress} className="items-center mx-2">
      <View
        className={cn(
          "p-0.5 rounded-full border-[2.5px]",
          ring.hasUnread
            ? "border-light-accent dark:border-dark-accent"
            : "border-light-gray dark:border-dark-gray",
        )}
      >
        <UniImage
          source={{ uri: iconUrl }}
          className="w-13 h-13 rounded-full"
          contentFit="cover"
        />
      </View>
      <Text
        className="text-xs text-light-text dark:text-dark-text mt-1 w-16 text-center"
        numberOfLines={1}
      >
        {ring.user.displayName || ring.user.screenName}
      </Text>
    </Pressable>
  );
};
