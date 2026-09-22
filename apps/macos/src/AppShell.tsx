import { createStackNavigator } from "@natsuneko-laboratory/react-native-desktop-navigation";
import {
  createSidebarNavigator,
  NavigationContainer,
  type RootNavigationState,
} from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { Bell, CalendarDays, GalleryHorizontal, Home, Search, Trophy } from "lucide-react-native";
import { accountAtom } from "@/atoms/account";
import { contestsAtom } from "@/atoms/contests";
import { clientAtom } from "@/atoms/credential";
import { themeAtom } from "@/atoms/theme";
import { trendsAtom } from "@/atoms/trends";
import { useAtomValue, useSetAtom } from "jotai";
import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { SidebarFooter, type SidebarAccount } from "./components/sidebar-footer";
import { useInterval } from "./hooks/use-interval";
import { login } from "./models/auth";
import { CatalystTrend } from "./models/sdk-types";
import { NavigationRef, type RootParams } from "./navigation";
import { GalleryScreen, ThemesScreen } from "./screens/collection";
import { ContestsScreen } from "./screens/contests";
import { ExplorerScreen } from "./screens/explorer";
import { HomeScreen } from "./screens/home";
import { NotificationsScreen } from "./screens/notifications";
import { SettingsScreen } from "./screens/settings";
import { NavigationThemes, SidebarAppearance } from "./theme";

type SidebarPages = "Home" | "Explorer" | "Notifications" | "Contests" | "Theme" | "Gallery";
type SidebarParams = { [key in SidebarPages]: undefined };

const SidebarNavigator = createSidebarNavigator<SidebarParams>();

// Native stack (alpha.18) reports pushed scenes outside the window with zero width on macOS.
// Use the React stack until native content-slot measurements are fixed.
const RootStack = createStackNavigator<RootParams>();

type ShellState = {
  account: SidebarAccount | null;
  unreadNotifications?: number;
};

// Screen の component には props を渡せないため、シェル全体の状態は Context で配る
const ShellContext = createContext<ShellState>({ account: null });

const MainNavigator = () => {
  const theme = useColorScheme();
  const strokeColor = NavigationThemes[theme ?? "light"].colors.text;
  const accentColor = NavigationThemes[theme ?? "light"].colors.accent;
  const { account, unreadNotifications } = useContext(ShellContext);

  return (
    <SidebarNavigator.Navigator
      width={240}
      appearance={SidebarAppearance}
      renderSidebarFooter={(props) => (
        <SidebarFooter
          {...props}
          account={account}
          onLogin={() => login().catch(console.error)}
          onOpenSettings={() => NavigationRef.navigate("Settings")}
        />
      )}
    >
      <SidebarNavigator.Screen
        name="Home"
        component={HomeScreen}
        options={{
          label: "ホーム",
          icon: ({ focused }) => <Home size={16} stroke={focused ? accentColor : strokeColor} />
        }}
      />
      <SidebarNavigator.Screen
        name="Explorer"
        component={ExplorerScreen}
        options={{
          label: "探索",
          icon: ({ focused }) => <Search size={16} stroke={focused ? accentColor : strokeColor} />,
        }}
      />
      <SidebarNavigator.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          label: "通知",
          icon: ({ focused }) => <Bell size={16} stroke={focused ? accentColor : strokeColor} />,
          badge: unreadNotifications
        }}
      />
      <SidebarNavigator.Section title="コンテンツ">
        <SidebarNavigator.Screen
          name="Contests"
          component={ContestsScreen}
          options={{
            label: "コンテスト",
            icon: ({ focused }) => <Trophy size={16} stroke={focused ? accentColor : strokeColor} />
          }}
        />
        <SidebarNavigator.Screen
          name="Theme"
          component={ThemesScreen}
          options={{
            label: "お題",
            icon: ({ focused }) => <CalendarDays size={16} stroke={focused ? accentColor : strokeColor} />
          }}
        />
        <SidebarNavigator.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{
            label: "ギャラリー",
            icon: ({ focused }) => <GalleryHorizontal size={16} stroke={focused ? accentColor : strokeColor} />
          }}
        />
      </SidebarNavigator.Section>
    </SidebarNavigator.Navigator>
  );
};

type Props = Partial<ShellState> & {
  initialState?: RootNavigationState;
};

export const AppShell = ({ initialState, account: accountOverride, unreadNotifications }: Props) => {
  const current = useAtomValue(accountAtom);
  const account =
    accountOverride ??
    (current ? { displayName: current.user.displayName, screenName: current.user.screenName } : null);
  const scheme = useColorScheme();
  const theme = NavigationThemes[scheme === "dark" ? "dark" : "light"];
  const client = useAtomValue(clientAtom);
  const setTrends = useSetAtom(trendsAtom);
  const setContests = useSetAtom(contestsAtom);
  const setWeeklyTheme = useSetAtom(themeAtom);

  useInterval(async () => {
    const [trends, contests, weeklyTheme] = await Promise.all([
      client.catalyst.v1.trend
        .get({ query: { format: "rich" } })
        .then((w) => w.data)
        .catch(() => [] as CatalystTrend[]),
      client.catalyst.v1.contest.current.get().then((w) => w.data).catch(() => undefined),
      client.catalyst.v1.weeklyThemes.current.get().then((w) => w.data).catch(() => null),
    ]);

    setTrends(trends ?? []);
    setContests(contests?.contests ?? []);
    setWeeklyTheme(weeklyTheme?.theme ?? null);
  }, 1000 * 60 * 5);

  return (
    <ShellContext.Provider value={{ account, unreadNotifications }}>
      <NavigationContainer ref={NavigationRef} initialState={initialState} theme={theme}>
        <RootStack.Navigator screenOptions={{ headerBackTitle: "戻る" }}>
          <RootStack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
          <RootStack.Screen name="Settings" component={SettingsScreen} options={{ title: "設定" }} />
        </RootStack.Navigator>
      </NavigationContainer>
    </ShellContext.Provider>
  );
};
