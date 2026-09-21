import {
  createNavigationRef,
  createSidebarNavigator,
  createStackNavigator,
  NavigationContainer,
  useIsFocused,
  useRoute,
  type NavigationRef,
  type NavigationRoute,
  type RootNavigationState,
} from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { useAtomValue, useSetAtom } from "jotai";
import { Bell, CalendarDays, GalleryHorizontal, Home, Search, Trophy } from "lucide-react-native";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme, View } from "react-native";
import { contestsAtom } from "./atoms/contests";
import { clientAtom } from "./atoms/credential";
import { themeAtom } from "./atoms/theme";
import { trendsAtom } from "./atoms/trends";
import { ContextMenuHost } from "./components/context-menu";
import { ShortcutScope } from "./components/shortcut-scope";
import { SidebarFooter, type SidebarAccount } from "./components/sidebar-footer";
import { useInterval } from "./hooks/use-interval";
import { useContainerWidth, useWindowClass, WindowWidthContext } from "./layout/breakpoints";
import { CatalystTrend } from "./models/sdk-types";
import type { RootParams, SidebarParams } from "./navigation";
import { getSceneTitle, type Scene } from "./scenes/scene";
import { SceneHostContext } from "./scenes/scene-host";
import { ContestsScreen, GalleryScreen, ThemesScreen } from "./screens/collection";
import { ExplorerScreen } from "./screens/explorer";
import { HomeScreen } from "./screens/home";
import { NotificationsScreen } from "./screens/notifications";
import { SceneContent } from "./screens/scene-content";
import { NavigationThemes, SidebarAppearance } from "./theme";

const SidebarNavigator = createSidebarNavigator<SidebarParams>();
const RootStack = createStackNavigator<RootParams>();

type ShellState = {
  account: SidebarAccount | null;
  unreadNotifications?: number;
  navigationRef: NavigationRef<RootParams> | null;
};

// Screen の component には props を渡せないため、シェル全体の状態は Context で配る
const ShellContext = createContext<ShellState>({
  account: null,
  navigationRef: null,
});

// ウィンドウ幅が expanded を下回ったらサイドバーをアイコンだけのレールに畳み、戻ったら開く。
// 閾値をまたいだときだけ切り替えるので、ユーザーが手動で開閉した状態はリサイズしない限り保たれる
const useAutoCollapseSidebar = () => {
  const { navigationRef } = useContext(ShellContext);
  const measured = useContext(WindowWidthContext) > 0;
  const windowClass = useWindowClass();
  const focused = useIsFocused();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const expanded = windowClass === "expanded";
    const key = String(expanded);
    // スタックに投稿詳細などが積まれている間はサイドバーが非アクティブで action を処理できないため、戻ってきたときに反映する
    if (!measured || !focused || previous.current === key) return;
    previous.current = key;
    navigationRef?.dispatch({
      type: expanded ? "expandSidebar" : "collapseSidebar",
    });
  }, [navigationRef, windowClass, focused, measured]);
};

const MainNavigator = () => {
  const scheme = useColorScheme();
  const colors = NavigationThemes[scheme === "light" ? "light" : "dark"].colors;
  const { account, unreadNotifications } = useContext(ShellContext);

  useAutoCollapseSidebar();

  const icon =
    (Icon: typeof Home) =>
      ({ focused }: { focused: boolean }) => <Icon size={16} stroke={focused ? colors.accent : colors.text} />;

  return (
    <SidebarNavigator.Navigator
      width={260}
      appearance={SidebarAppearance}
      renderSidebarFooter={(props) => <SidebarFooter {...props} account={account} />}
    >
      <SidebarNavigator.Screen name="Home" component={HomeScreen} options={{ label: "ホーム", icon: icon(Home) }} />
      <SidebarNavigator.Screen
        name="Explorer"
        component={ExplorerScreen}
        options={{ label: "探索", icon: icon(Search) }}
      />
      <SidebarNavigator.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          label: "通知",
          icon: icon(Bell),
          badge: unreadNotifications,
        }}
      />
      <SidebarNavigator.Section title="コンテンツ">
        <SidebarNavigator.Screen
          name="Contests"
          component={ContestsScreen}
          options={{ label: "コンテスト", icon: icon(Trophy) }}
        />
        <SidebarNavigator.Screen
          name="Theme"
          component={ThemesScreen}
          options={{ label: "お題", icon: icon(CalendarDays) }}
        />
        <SidebarNavigator.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{ label: "ギャラリー", icon: icon(GalleryHorizontal) }}
        />
      </SidebarNavigator.Section>
    </SidebarNavigator.Navigator>
  );
};

const routeToScene = (route: NavigationRoute): Scene => {
  const params = (route.params ?? {}) as Record<string, string | undefined>;

  switch (route.name) {
    case "Status":
      return { type: "status", id: params.id ?? "" };
    case "User":
      return { type: "user", screenName: params.screenName ?? "" };
    case "Compose":
      return { type: "compose", replyTo: params.replyTo };
    case "Settings":
      return { type: "settings" };
    default:
      return { type: "main" };
  }
};

// スタックに積まれた詳細系の画面。ペインは持たないが、右クリックメニューとショートカットはサイドバーの画面と同じく使える
const StackScene = () => {
  const route = useRoute();
  const scene = useMemo(() => routeToScene(route), [route]);

  return (
    <ContextMenuHost>
      <ShortcutScope>
        <SceneContent scene={scene} />
      </ShortcutScope>
    </ContextMenuHost>
  );
};

const sceneToRoute = (scene: Scene): { name: keyof RootParams; params?: object } => {
  switch (scene.type) {
    case "status":
      return { name: "Status", params: { id: scene.id } };
    case "user":
      return { name: "User", params: { screenName: scene.screenName } };
    case "compose":
      return { name: "Compose", params: { replyTo: scene.replyTo } };
    case "settings":
      return { name: "Settings" };
    case "main":
      return { name: "Main" };
  }
};

type Props = Partial<Omit<ShellState, "navigationRef">> & {
  initialState?: RootNavigationState;
  // 別ウィンドウとして開く場合の最初の画面と native 側のウィンドウ ID
  scene?: Scene;
  windowId?: number;
};

export const AppShell = ({
  initialState,
  account = null,
  unreadNotifications,
  scene = { type: "main" },
  windowId,
}: Props) => {
  const colorScheme = useColorScheme();
  const theme = NavigationThemes[colorScheme === "dark" ? "dark" : "light"];
  // ウィンドウごとに NavigationContainer が別になるため、ref もグローバルではなくシェル単位で持つ
  const [navigationRef] = useState(() => createNavigationRef<RootParams>());
  const initial = sceneToRoute(scene);
  const { width, onLayout } = useContainerWidth();
  const client = useAtomValue(clientAtom);
  const setTrends = useSetAtom(trendsAtom);
  const setContests = useSetAtom(contestsAtom);
  const setTheme = useSetAtom(themeAtom);

  useInterval(async () => {
    "worklets";

    // メインウィンドウでだけ実行する
    if (windowId) {
      return;
    }

    const [trends, contests, weeklyTheme] = await Promise.all([
      client.catalyst.v1.trend.get({ query: { format: "rich" } }).then(w => w.data).catch(() => [] as CatalystTrend[]),
      client.catalyst.v1.contest.current.get().then(w => w.data).catch(() => undefined),
      client.catalyst.v1.weeklyThemes.current.get().then(w => w.data).catch(() => null),
    ]);

    setTrends(trends ?? []);
    setContests(contests?.contests ?? []);
    setTheme(weeklyTheme?.theme ?? null);
  }, 1000 * 60 * 5);

  return (
    <View className="flex-1" onLayout={onLayout}>
      <WindowWidthContext.Provider value={width}>
        <ShellContext.Provider value={{ account, unreadNotifications, navigationRef }}>
          <SceneHostContext.Provider value={{ windowId }}>
            <NavigationContainer ref={navigationRef} initialState={initialState} theme={theme}>
              <RootStack.Navigator initialRouteName={initial.name} screenOptions={{ headerBackTitle: "戻る" }}>
                {/* 別ウィンドウで詳細を開いたときは Main を積まない (戻る先がないので閉じるのはウィンドウ側で行う) */}
                {scene.type === "main" && (
                  <RootStack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
                )}
                <RootStack.Screen
                  name="Status"
                  component={StackScene}
                  initialParams={initial.name === "Status" ? (initial.params as RootParams["Status"]) : undefined}
                  options={{ title: getSceneTitle({ type: "status", id: "" }) }}
                />
                <RootStack.Screen
                  name="User"
                  component={StackScene}
                  initialParams={initial.name === "User" ? (initial.params as RootParams["User"]) : undefined}
                  options={({ route }) => ({
                    title: `@${(route.params as RootParams["User"]).screenName}`,
                  })}
                />
                <RootStack.Screen
                  name="Compose"
                  component={StackScene}
                  initialParams={initial.name === "Compose" ? (initial.params as RootParams["Compose"]) : undefined}
                  options={{ title: "新規投稿" }}
                />
                <RootStack.Screen name="Settings" component={StackScene} options={{ title: "設定" }} />
              </RootStack.Navigator>
            </NavigationContainer>
          </SceneHostContext.Provider>
        </ShellContext.Provider>
      </WindowWidthContext.Provider>
    </View>
  );
};
