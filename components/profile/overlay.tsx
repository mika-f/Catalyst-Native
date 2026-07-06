import { BottomSheetItem } from "@/components/bottom-sheet/item";
import { BottomSheetModal, BottomSheetModalHandle } from "@/components/bottom-sheet/sheet";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystRelationships, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ArrowLeft, Ellipsis, ShareIcon, ShieldBan } from "lucide-react-native";
import { useCallback, useRef } from "react";
import { Animated, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniAnimatedView = withUniwind(Animated.View);
const UniArrowLeft = withUniwind(ArrowLeft);
const UniEllipsis = withUniwind(Ellipsis);
const UniShare = withUniwind(ShareIcon);
const UniShieldBan = withUniwind(ShieldBan);

type Props = {
  user: EgeriaUser | null;
  relationships?: CatalystRelationships | null;
  scrollY: Animated.Value;
  showBackButton?: boolean;
  onUpdateRelationships?: (relationships: CatalystRelationships) => void;
};

export const ProfileOverlay = ({ user, relationships, scrollY, showBackButton = true }: Props) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const client = useAtomValue(clientAtom);
  const overlayHeight = insets.top + 44;
  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, 32],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const handleBack = useCallback(() => router.back(), [router]);
  const sheet = useRef<BottomSheetModalHandle>(null);
  const url = `https://catalyst.natsuneko.com/@${user?.screenName}`;
  const handleSheetOpen = useCallback(() => sheet.current?.present(), []);
  const handleShareUser = useCallback(() => {
    sheet.current?.dismiss();
    if (Platform.OS === "ios") {
      Share.share({
        message: `${user?.displayName} (@${user?.screenName})`,
        url: url,
      });
    } else {
      Share.share({
        message: `${user?.displayName} (@${user?.screenName})\n${url}`,
      });
    }
  }, [user, url]);
  const handleToggleBlock = useCallback(async () => {
    sheet.current?.dismiss();

    if (!user || !relationships) return;

    const isBlocking = relationships.isBlocking;
    if (isBlocking) {
      await client.catalyst.unblock(user.id);
    } else {
      await client.catalyst.block(user.id);
    }
  }, [user, relationships, client]);

  return (
    <View
      className="absolute left-0 right-0 top-0 flex-row w-full"
      style={{ height: overlayHeight, paddingTop: insets.top }}
    >
      <UniAnimatedView
        className="bg-light-background dark:bg-dark-background"
        style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
      />
      <View className="relative flex-row flex-1 items-center">
        <Animated.Text
          className="flex-1 text-base font-semibold text-center text-light-text dark:text-dark-text"
          style={{ opacity: overlayOpacity }}
          numberOfLines={1}
        >
          {user?.displayName}
        </Animated.Text>

        {showBackButton && (
          <TouchableOpacity className="absolute p-2 m-2" onPress={handleBack}>
            <View className="w-9 h-9 rounded-full bg-black/75 items-center justify-center">
              <UniArrowLeft size={18} className="text-white" />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity className="absolute right-0 p-2 m-2" onPress={handleSheetOpen}>
          <View className="w-9 h-9 rounded-full bg-black/75 items-center justify-center">
            <UniEllipsis size={18} className="text-white" />
          </View>
        </TouchableOpacity>
      </View>
      <BottomSheetModal ref={sheet}>
        <BottomSheetItem
          prefixIcon={UniShare}
          title={
            <View className="flex-row items-center">
              <Text className="shrink text-light-text dark:text-dark-text" numberOfLines={1} ellipsizeMode="tail">
                @{user?.screenName}
              </Text>
              <Text className="shrink-0 text-light-text dark:text-dark-text">さんを共有する</Text>
            </View>
          }
          onPress={handleShareUser}
          highlight
        />
        {!relationships?.isMyself && (
          <BottomSheetItem
            prefixIcon={UniShieldBan}
            title={
              <View className="flex-row items-center">
                <Text className="shrink text-light-error dark:text-dark-error" numberOfLines={1} ellipsizeMode="tail">
                  @{user?.screenName}
                </Text>
                <Text className="shrink-0 text-light-error dark:text-dark-error">
                  {`さんをブロック${relationships?.isBlocking ? "解除" : ""}`}
                </Text>
              </View>
            }
            onPress={handleToggleBlock}
            destructive
          />
        )}
      </BottomSheetModal>
    </View>
  );
};
