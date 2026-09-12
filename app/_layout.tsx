// polyfills
import "@natsuneko-laboratory/react-native-webcrypto-digest";
import "react-native-get-random-values";

// imports
import { CatalystToast } from "@/components/design-system/toast";
import { headerSurfaceOptions } from "@/components/navigation/app-header";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSystemReducedMotionSync } from "@/hooks/use-reduced-motion";
import {
  loadBoostTextContrast,
  loadFleetPace,
  loadHapticsEnabled,
  loadReduceMotionPreference,
  loadUnderlineLinks,
} from "@/models/accessibility-settings";
import {
  boostTextContrastAtom,
  fleetPaceAtom,
  hapticsEnabledAtom,
  reduceMotionPreferenceAtom,
  underlineLinksAtom,
} from "@/models/atoms/accessibility";
import { accountAtom } from "@/models/atoms/account";
import {
  timelineImageQualityAtom,
  timelineWifiUpgradeAtom,
} from "@/models/atoms/image-quality";
import { hideSensitiveContentAtom } from "@/models/atoms/sensitive-content";
import { streamingEnabledAtom } from "@/models/atoms/streaming";
import * as Credential from "@/models/credential";
import {
  loadTimelineImageQuality,
  loadWifiUpgrade,
} from "@/models/image-quality-settings";
import { loadHideSensitiveContent } from "@/models/sensitive-content-settings";
import { StreamingProvider } from "@/models/streaming";
import { loadStreamingEnabled } from "@/models/streaming-settings";
import { importStorageSnapshot } from "@/models/storage-migration";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";

import "@/global.css";

if (Platform.OS === "android") {
  // バックグラウンドでの通知受信ハンドラ
  setBackgroundMessageHandler(getMessaging(), async (_remoteMessage) => {
    // バックグラウンド通知の処理（現時点では特別な処理は不要）
  });
}

Sentry.init({
  dsn: "https://6d7c270e3a7bb56c0a746319d7e885d5@o4504564074348544.ingest.us.sentry.io/4510957726793728",

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  duration: 250,
  fade: true,
});


export const unstable_settings = {
  anchor: "(drawer)",
};

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const setAccount = useSetAtom(accountAtom);
  const setTimelineImageQuality = useSetAtom(timelineImageQualityAtom);
  const setTimelineWifiUpgrade = useSetAtom(timelineWifiUpgradeAtom);
  const setHideSensitiveContent = useSetAtom(hideSensitiveContentAtom);
  const setStreamingEnabled = useSetAtom(streamingEnabledAtom);
  const setReduceMotionPreference = useSetAtom(reduceMotionPreferenceAtom);
  const setFleetPace = useSetAtom(fleetPaceAtom);
  const setUnderlineLinks = useSetAtom(underlineLinksAtom);
  const setBoostTextContrast = useSetAtom(boostTextContrastAtom);
  const setHapticsEnabled = useSetAtom(hapticsEnabledAtom);
  useSystemReducedMotionSync();
  const [loaded, error] = useFonts({
    "Noto Sans JP Regular": require("@/assets/fonts/NotoSansJP-Regular.ttf"),
    "Noto Sans JP Bold": require("@/assets/fonts/NotoSansJP-Bold.ttf"),
    "HunyaJi-Re": require("@/assets/fonts/HonyaJi-Re.ttf"),
    "FiraCode-Regular": require("@/assets/fonts/FiraCode-Regular.ttf"),
  });

  useEffect(() => {
    // AsyncStorage 3.x から退避したスナップショットを取り込んでから設定を読む
    // (詳細は models/storage-migration.ts)
    importStorageSnapshot()
      .then(() =>
        Promise.all([
          loadTimelineImageQuality(),
          loadWifiUpgrade(),
          loadHideSensitiveContent(),
          loadStreamingEnabled(),
          loadReduceMotionPreference(),
          loadFleetPace(),
          loadUnderlineLinks(),
          loadBoostTextContrast(),
          loadHapticsEnabled(),
        ]),
      )
      .then(
        ([
          quality,
          wifiUpgrade,
          hideSensitiveContent,
          streamingEnabled,
          reduceMotionPreference,
          fleetPace,
          underlineLinks,
          boostTextContrast,
          hapticsEnabled,
        ]) => {
          setTimelineImageQuality(quality);
          setTimelineWifiUpgrade(wifiUpgrade);
          setHideSensitiveContent(hideSensitiveContent);
          setStreamingEnabled(streamingEnabled);
          setReduceMotionPreference(reduceMotionPreference);
          setFleetPace(fleetPace);
          setUnderlineLinks(underlineLinks);
          setBoostTextContrast(boostTextContrast);
          setHapticsEnabled(hapticsEnabled);
        },
      );
  }, [
    setBoostTextContrast,
    setFleetPace,
    setHapticsEnabled,
    setHideSensitiveContent,
    setReduceMotionPreference,
    setStreamingEnabled,
    setTimelineImageQuality,
    setTimelineWifiUpgrade,
    setUnderlineLinks,
  ]);

  useAsyncOneTimeEffect(async () => {
    try {
      const { credential, isLoggedIn, user } = await Credential.tryRestore();

      setAccount(isLoggedIn && user ? { user, credential } : null);
    } finally {
      setIsLoaded(true);
      await SplashScreen.hideAsync();
    }
  });

  if (!isLoaded) {
    return null;
  }

  if (error || !loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <KeyboardProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <StreamingProvider>
              <Stack screenOptions={headerSurfaceOptions}>
                <Stack.Screen
                  name="(drawer)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                  name="album/[id]/index"
                  options={{ title: "", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="album/[id]/edit"
                  options={{ title: "アルバム編集", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="smart-album/[id]/index"
                  options={{ title: "", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="smart-album/[id]/edit"
                  options={{
                    title: "スマートアルバム編集",
                    headerBackTitle: "戻る",
                  }}
                />
                <Stack.Screen
                  name="status/[id]"
                  options={{ title: "投稿", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="user/[screenName]/index"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="user/[screenName]/followers"
                  options={{ title: "フォロワー", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="user/[screenName]/followings"
                  options={{ title: "フォロー", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="authorize"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="contest"
                  options={{ title: "コンテスト", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="contest/[slug]"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="theme"
                  options={{ title: "お題", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="theme/[slug]"
                  options={{ title: "お題", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="gallery"
                  options={{ title: "ギャラリー", headerBackTitle: "戻る" }}
                />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen
                  name="search/[query]"
                  options={{ headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="compose/post"
                  options={{
                    title: "新しい投稿",
                    headerBackTitle: "キャンセル",
                  }}
                />
                <Stack.Screen
                  name="compose/fleet"
                  options={{ title: "Fleet", headerBackTitle: "キャンセル" }}
                />
                <Stack.Screen
                  name="report/[id]"
                  options={{
                    title: "報告",
                    headerBackTitle: "キャンセル",
                  }}
                />
                <Stack.Screen
                  name="fleet/[id]/reactions"
                  options={{ title: "リアクション", headerBackTitle: "戻る" }}
                />
                <Stack.Screen
                  name="profile/edit"
                  options={{
                    title: "プロフィールを編集",
                    headerBackTitle: "キャンセル",
                  }}
                />
                <Stack.Screen
                  name="tags/[name]"
                  options={{ headerBackTitle: "戻る" }}
                />
              </Stack>
              <StatusBar style="auto" />
              <CatalystToast />
            </StreamingProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
});
