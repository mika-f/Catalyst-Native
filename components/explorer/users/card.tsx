import { CatalystAvatar, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { getCdnUrl } from "@/lib/media";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);

type Props = {
  user: EgeriaUser;
};

export const UserCard = ({ user }: Props) => {
  const router = useRouter();

  return (
    <CatalystListItem
      onPress={() => router.push(`/user/${user.screenName}`)}
    >
      <CatalystAvatar
        alt={user.displayName}
        fallback={user.displayName}
        size="lg"
        source={user.profile ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) : null}
      />

      <CatalystListItemContent>
        <View className="flex-row items-center gap-1">
          <CatalystText variant="subtitle" className="shrink" numberOfLines={1}>
            {user.displayName}
          </CatalystText>
          <ProfileEmoji emoji={user.profileEmoji} size={16} />
        </View>
        <CatalystText tone="muted" numberOfLines={1}>
          @{user.screenName}
        </CatalystText>
        {user.profile && user.profile.bio.length > 0 && (
          <CatalystText variant="caption" tone="muted" numberOfLines={2}>
            {user.profile.bio}
          </CatalystText>
        )}
      </CatalystListItemContent>

      <UniChevronRight size={14} className="text-light-icon dark:text-dark-icon" />
    </CatalystListItem>
  );
};
