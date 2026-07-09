import { CatalystAvatar, CatalystIconButton } from "@/components/design-system";
import { DrawerContent } from "@/components/drawer/drawer-content";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { DrawerActions, useIsFocused } from "expo-router/react-navigation";
import { useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useAtomValue } from "jotai";
import { Menu } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UniMenu = withUniwind(Menu);

export default function DrawerLayout() {
  const account = useAtomValue(accountAtom);
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const isFocused = useIsFocused();
  const [isProfileTab, setIsProfileTab] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setIsProfileTab(segments.includes("profile" as never));
    }
  }, [isFocused, segments]);

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerTitle: "",
        headerShadowVisible: false,
        headerShown: !isProfileTab,
        swipeEnabled: !isProfileTab,
        headerStyle: {
          backgroundColor: colorScheme === "dark" ? "#151718" : "#ffffff",
        },
        headerLeft: () => {
          const openDrawer = () => {
            navigation.dispatch(DrawerActions.openDrawer());
          };

          return (
            <View className="pl-4">
              {account?.user.profile ? (
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
              )}
            </View>
          );
        },
      })}
      drawerContent={({ navigation }) => <DrawerContent navigation={navigation} />}
    />
  );
}