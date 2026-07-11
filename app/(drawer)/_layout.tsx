import { CatalystAvatar, CatalystIconButton } from "@/components/design-system";
import { DrawerContent } from "@/components/drawer/drawer-content";
import { CatalystAppHeader } from "@/components/navigation/app-header";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { DrawerActions, useIsFocused } from "expo-router/react-navigation";
import { useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAtomValue } from "jotai";
import { Menu } from "lucide-react-native";
import { Pressable } from "react-native";
import { withUniwind } from "uniwind";

const UniMenu = withUniwind(Menu);

export default function DrawerLayout() {
  const account = useAtomValue(accountAtom);
  const segments = useSegments();
  const isFocused = useIsFocused();
  const isProfileTab = isFocused && segments.includes("profile" as never);

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerShown: !isProfileTab,
        swipeEnabled: !isProfileTab,
        header: () => {
          const openDrawer = () => {
            navigation.dispatch(DrawerActions.openDrawer());
          };

          return (
            <CatalystAppHeader
              left={
                account?.user.profile ? (
                  <Pressable
                    accessibilityLabel="メニューを開く"
                    accessibilityRole="button"
                    className="active:opacity-80"
                    onPress={openDrawer}
                  >
                    <CatalystAvatar
                      alt={account.user.displayName}
                      fallback={account.user.displayName}
                      size="sm"
                      source={getCdnUrl({
                        src: account.user.profile.iconUrl,
                        variant: "icon",
                        width: 64,
                      })}
                    />
                  </Pressable>
                ) : (
                  <CatalystIconButton label="メニューを開く" size="sm" tone="ghost" onPress={openDrawer}>
                    <UniMenu />
                  </CatalystIconButton>
                )
              }
            />
          );
        },
      })}
      drawerContent={({ navigation }) => <DrawerContent navigation={navigation} />}
    />
  );
}
