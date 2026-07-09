import { CatalystText } from "@/components/design-system";
import { Fonts } from "@/constants/theme";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import * as Credential from "@/models/credential";
import { DrawerActions, useIsFocused } from "expo-router/react-navigation";
import { Image } from "expo-image";
import { router, useSegments } from "expo-router";
import type { DrawerNavigationHelpers } from "expo-router/build/react-navigation/drawer/types";
import { Drawer } from "expo-router/drawer";
import { useAtom, useAtomValue } from "jotai";
import { Cog, Images, LogIn, Menu, Trophy, User } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

type RelationshipCounts = {
  followers: number | null;
  followings: number | null;
};

type Route = {
  name: string;
  href: string;
  icon: () => React.ReactNode;
};

const DrawerMenu = ({ route, navigation }: { route: Route; navigation: DrawerNavigationHelpers }) => {
  const onPress = useCallback(() => {
    navigation.dispatch(DrawerActions.closeDrawer());
    router.push(route.href as never);
  }, [route, navigation]);

  return (
    <Pressable className="pl-8 px-4 py-1.5 my-1" onPress={onPress}>
      <View className="flex-row items-center">
        <View className="pr-2">{route.icon()}</View>
        <Text className="text-light-text dark:text-dark-text text-lg">{route.name}</Text>
      </View>
    </Pressable>
  );
};

const UniImage = withUniwind(Image);
const UniUser = withUniwind(User);
const UniTrophy = withUniwind(Trophy);
const UniImages = withUniwind(Images);
const UniCog = withUniwind(Cog);
const UniMenu = withUniwind(Menu);
const UniLogIn = withUniwind(LogIn);

export default function DrawerLayout() {
  const [account, setAccount] = useAtom(accountAtom);
  const client = useAtomValue(clientAtom);
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const [counts, setCounts] = useState<RelationshipCounts | null>(null);
  const headers: Route[] = useMemo(() => {
    return [
      account?.user.profile && {
        name: "プロフィール",
        href: `/user/${account.user.screenName ?? ""}`,
        icon: () => <UniUser className="text-light-text dark:text-dark-text" size={32} />,
      },
      {
        name: "コンテスト",
        href: "/contest",
        icon: () => <UniTrophy className="text-light-text dark:text-dark-text" size={32} />,
      },
      {
        name: "ギャラリー",
        href: "/gallery",
        icon: () => <UniImages className="text-light-text dark:text-dark-text" size={32} />,
      },
    ].filter(Boolean) as Route[];
  }, [account]);

  const footers: Route[] = useMemo(() => {
    return [
      {
        name: "設定とプライバシー",
        href: "/settings",
        icon: () => <UniCog className="text-light-text dark:text-dark-text" size={32} />,
      },
    ].filter(Boolean) as Route[];
  }, []);

  const handleLogin = useCallback(async () => {
    const { credential, isLoggedIn, user } = await Credential.login();
    if (isLoggedIn && user) {
      setAccount({ user, credential });
    }
  }, [setAccount]);

  const isFocused = useIsFocused();
  const [isProfileTab, setIsProfileTab] = useState(false);

  useAsyncEffect(async () => {
    const screenName = account?.user.screenName;
    if (!screenName) {
      setCounts(null);
      return;
    }

    const { data: c } = await client.catalyst.v1.relationships.by.username.username.counts.get({
      path: { username: screenName },
      throwOnError: true,
    });
    setCounts(c);
  }, [account?.user.screenName, client.catalyst]);

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
                <View className="w-8 h-8 rounded-full">
                  <Pressable onPress={openDrawer}>
                    <UniImage
                      source={{
                        uri: getCdnUrl({
                          src: account.user.profile.iconUrl,
                          variant: "icon",
                          width: 64,
                        }),
                      }}
                      className="w-8 h-8 rounded-full"
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={openDrawer}>
                  <UniMenu className="text-light-text dark:text-dark-text" />
                </Pressable>
              )}
            </View>
          );
        },
      })}
      drawerContent={({ navigation }) => (
        <SafeAreaView>
          <View className="flex flex-col pt-4">
            {account?.user.profile != null ? (
              <View className="border-b dark:border-dark-border border-light-border pb-4">
                <View className="pl-8">
                  <Pressable
                    className="active:opacity-80"
                    onPress={() => {
                      navigation.dispatch(DrawerActions.closeDrawer());
                      router.push(`/user/${account.user.screenName}`);
                    }}
                  >
                    <UniImage
                      source={getCdnUrl({
                        src: account.user.profile.iconUrl,
                        variant: "icon",
                        width: 96,
                      })}
                      className="h-24 w-24 rounded-full"
                      style={{ width: 96, height: 96 }}
                    />

                    <View className="mt-2">
                      <Text className="text-lg font-bold mt-2 text-light-text dark:text-dark-text">
                        {account.user.displayName}
                      </Text>

                      <Text className="text-sm text-neutral-500" style={{ fontFamily: Fonts.mono }}>
                        @{account.user.screenName}
                      </Text>
                    </View>
                  </Pressable>

                  <View className="mt-3 flex-row gap-5">
                    <Pressable
                      className="flex-row items-baseline gap-1 active:opacity-80"
                      onPress={() => {
                        navigation.dispatch(DrawerActions.closeDrawer());
                        router.push(`/user/${account.user.screenName}/followings`);
                      }}
                      disabled={counts === null || counts.followings === null}
                    >
                      <CatalystText variant="label">
                        {counts === null || counts.followings === null ? "-" : counts.followings}
                      </CatalystText>
                      <CatalystText variant="body" tone="muted">
                        フォロー
                      </CatalystText>
                    </Pressable>
                    <Pressable
                      className="flex-row items-baseline gap-1 active:opacity-80"
                      onPress={() => {
                        navigation.dispatch(DrawerActions.closeDrawer());
                        router.push(`/user/${account.user.screenName}/followers`);
                      }}
                      disabled={counts === null || counts.followers === null}
                    >
                      <CatalystText variant="label">
                        {counts === null || counts.followers === null ? "-" : counts.followers}
                      </CatalystText>
                      <CatalystText variant="body" tone="muted">
                        フォロワー
                      </CatalystText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  navigation.dispatch(DrawerActions.closeDrawer());
                  handleLogin();
                }}
              >
                <View className="border-b dark:border-dark-border border-light-border pb-4">
                  <View className="pl-8 flex-row items-center gap-3 py-2">
                    <UniLogIn className="text-light-tint dark:text-dark-tint" size={24} />
                    <Text className="text-base text-light-tint dark:text-dark-tint">ログイン</Text>
                  </View>
                </View>
              </Pressable>
            )}
            <View>
              <View className="border-b dark:border-dark-border border-light-border py-4">
                {headers.map((route) => (
                  <DrawerMenu key={route.name} route={route} navigation={navigation} />
                ))}
              </View>
              <View className="border-b dark:border-dark-border border-light-border py-4">
                {footers.map((route) => (
                  <DrawerMenu key={route.name} route={route} navigation={navigation} />
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      )}
    />
  );
}
