import { useColorScheme } from "@/hooks/use-color-scheme";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { useAtomValue } from "jotai";
import { Bell, House, Search } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniHouse = withUniwind(House);
const UniSearch = withUniwind(Search);
const UniBell = withUniwind(Bell);

type TabItem = {
  key: string;
  label: string;
  href: string;
  icon: (className: string) => React.ReactNode;
  authRequired?: boolean;
};

function CustomTabBar({ state, navigation }: any) {
  const colorScheme = useColorScheme();
  const account = useAtomValue(accountAtom);
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const tabs: TabItem[] = [
    {
      key: "index",
      label: "ホーム",
      href: "/(drawer)/(tabs)/",
      icon: (className) => <UniHouse size={28} className={className} />,
    },
    {
      key: "explore",
      label: "検索",
      href: "/(drawer)/(tabs)/explore",
      icon: (className) => <UniSearch size={28} className={className} />,
    },
    ...(account
      ? [
          {
            key: "notifications",
            label: "通知",
            href: "/(drawer)/(tabs)/notifications",
            icon: (className: string) => <UniBell size={28} className={className} />,
          },
          {
            key: "profile",
            label: "プロフィール",
            href: "/(drawer)/(tabs)/profile",
            icon: () => (
              <View className="overflow-hidden rounded-full">
                <Image
                  source={`${account.user.profile?.iconUrl}/tiny`}
                  style={{ width: 28, height: 28 }}
                  contentFit="cover"
                />
              </View>
            ),
          },
        ]
      : []),
  ];

  const activeTabRoute = state.routes[state.index]?.name;

  const getIsActive = (tab: TabItem) => {
    if (tab.key === "index") return activeTabRoute === "index";
    return activeTabRoute === tab.key;
  };

  return (
    <View
      className="bg-light-background dark:bg-dark-background"
      style={{
        flexDirection: "row",
        paddingBottom: insets.bottom,
        borderTopWidth: 0.5,
        borderTopColor: colorScheme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = getIsActive(tab);
        const className = isActive ? "text-light-tint dark:text-dark-tint" : "text-light-icon dark:text-dark-icon";

        return (
          <Pressable
            key={tab.key}
            onPressIn={() => {
              if (process.env.EXPO_OS === "ios") {
                haptics.impact(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            onPress={() => {
              const route = state.routes.find((route: { name: string }) => route.name === tab.key);
              if (!route) {
                return;
              }

              const isFocused = state.routes[state.index]?.key === route.key;
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (isFocused && !event.defaultPrevented && tab.key === "index") {
                //
              }

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 8,
            }}
          >
            {tab.icon(className)}
            <Text
              className={cn("text-light-icon dark:text-light-icon", isActive && "text-light-tint dark:text-dark-tint")}
              style={{ fontSize: 10, marginTop: 2 }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
