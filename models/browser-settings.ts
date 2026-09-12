import { isCatalystUrl } from "@/lib/app-links";
import { isMacCatalyst } from "@/lib/device-layout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCustomTabsSupportingBrowsersAsync, openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import { Linking, Platform } from "react-native";

export type BrowserKey = "systemDefault" | "inApp" | "chrome" | "firefox" | "edge" | "brave" | "duckDuckGo";

export type BrowserDefinition = {
  key: BrowserKey;
  displayName: string;
  /** iOS URL scheme for canOpenURL check */
  iosScheme: string | null;
  /** Android package name for installation check / intent targeting */
  androidPackage: string | null;
  /** Always available (no install check needed) */
  alwaysAvailable: boolean;
};

export const BROWSERS: BrowserDefinition[] = [
  {
    key: "systemDefault",
    displayName: "デフォルトブラウザー",
    iosScheme: null,
    androidPackage: null,
    alwaysAvailable: true,
  },
  {
    key: "inApp",
    displayName: "In-App ブラウザー",
    iosScheme: null,
    androidPackage: null,
    alwaysAvailable: true,
  },
  {
    key: "chrome",
    displayName: "Chrome",
    iosScheme: "googlechrome://",
    androidPackage: "com.android.chrome",
    alwaysAvailable: false,
  },
  {
    key: "firefox",
    displayName: "Firefox",
    iosScheme: "firefox://",
    androidPackage: "org.mozilla.firefox",
    alwaysAvailable: false,
  },
  {
    key: "edge",
    displayName: "Microsoft Edge",
    iosScheme: "microsoft-edge-https://",
    androidPackage: "com.microsoft.emmx",
    alwaysAvailable: false,
  },
  {
    key: "brave",
    displayName: "Brave",
    iosScheme: "brave://",
    androidPackage: "com.brave.browser",
    alwaysAvailable: false,
  },
  {
    key: "duckDuckGo",
    displayName: "DuckDuckGo",
    iosScheme: "ddgQuickLink://",
    androidPackage: "com.duckduckgo.mobile.android",
    alwaysAvailable: false,
  },
];

const STORAGE_KEY = "selected_browser";

export async function loadSelectedBrowser(): Promise<BrowserKey> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value && BROWSERS.some((b) => b.key === value)) {
    return value as BrowserKey;
  }
  return "systemDefault";
}

export async function saveSelectedBrowser(browser: BrowserKey): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, browser);
}

type AndroidBrowsers = {
  /** インストール済みブラウザーのパッケージ名 */
  installed: Set<string>;
  /** 既定ブラウザーのパッケージ名 */
  defaultPackage: string | undefined;
  /** Custom Tabs を完全にサポートするブラウザーのパッケージ名 */
  preferredPackage: string | undefined;
};

const EMPTY_ANDROID_BROWSERS: AndroidBrowsers = {
  installed: new Set(),
  defaultPackage: undefined,
  preferredPackage: undefined,
};

/**
 * Android 11 以降は http/https の intent 解決に既定ブラウザーしか返らないため、
 * 影響を受けない Custom Tabs サービスの一覧 (servicePackages) を併用して判定する。
 */
async function getAndroidBrowsers(): Promise<AndroidBrowsers> {
  if (Platform.OS !== "android") return EMPTY_ANDROID_BROWSERS;

  try {
    const result = await getCustomTabsSupportingBrowsersAsync();

    return {
      installed: new Set([...(result.browserPackages ?? []), ...(result.servicePackages ?? [])]),
      defaultPackage: result.defaultBrowserPackage,
      preferredPackage: result.preferredBrowserPackage,
    };
  } catch {
    return EMPTY_ANDROID_BROWSERS;
  }
}

export async function getInstalledBrowsers(): Promise<BrowserDefinition[]> {
  if (Platform.OS === "android") {
    const { installed } = await getAndroidBrowsers();

    return BROWSERS.filter(
      (browser) =>
        browser.alwaysAvailable || (browser.androidPackage !== null && installed.has(browser.androidPackage)),
    );
  }

  const results = await Promise.all(
    BROWSERS.map(async (browser) => {
      // Mac Catalyst では SFSafariViewController が使えないため In-App ブラウザーは選ばせない
      if (browser.key === "inApp" && isMacCatalyst) return null;
      if (browser.alwaysAvailable) return browser;
      if (!browser.iosScheme) return null;

      try {
        const canOpen = await Linking.canOpenURL(browser.iosScheme);
        return canOpen ? browser : null;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((b): b is BrowserDefinition => b !== null);
}

/**
 * Catalyst は catalyst.natsuneko.com を検証済み App Link として登録しているため、
 * 自身の URL を暗黙の ACTION_VIEW (Linking.openURL / パッケージ未指定の Custom Tabs) に
 * 渡すと Catalyst 自身に解決されてしまい、ブラウザーに到達しない。
 * パッケージを固定した Custom Tabs で開くことでこれを回避する。
 */
async function openUrlOnAndroid(url: string, selected: BrowserKey): Promise<void> {
  // 自身が App Link として掴まない URL は、従来どおり既定ブラウザーの通常タブで開く
  if (selected === "systemDefault" && !isCatalystUrl(url)) {
    await Linking.openURL(url);
    return;
  }

  const browsers = await getAndroidBrowsers();
  const fallbackPackage =
    selected === "inApp" ? (browsers.preferredPackage ?? browsers.defaultPackage) : browsers.defaultPackage;

  // 設定を保存した後にアンインストールされている可能性があるため、実在するパッケージだけを使う
  const selectedPackage = BROWSERS.find((b) => b.key === selected)?.androidPackage;
  const browserPackage =
    selectedPackage != null && browsers.installed.has(selectedPackage) ? selectedPackage : fallbackPackage;

  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    browserPackage,
  });
}

/**
 * Open a URL using the user's selected browser.
 */
export async function openUrlWithBrowser(url: string, browserKey?: BrowserKey): Promise<void> {
  const selected = browserKey ?? (await loadSelectedBrowser());

  if (Platform.OS === "android") {
    await openUrlOnAndroid(url, selected);
    return;
  }

  switch (selected) {
    case "inApp": {
      // iPhone / iPad で In-App を選んだ状態のまま Mac に引き継がれた場合のフォールバック
      if (isMacCatalyst) {
        await Linking.openURL(url);
        return;
      }

      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    }
    case "chrome": {
      const scheme = url.startsWith("https://") ? "googlechromes://" : "googlechrome://";
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`${scheme}${withoutScheme}`);
      return;
    }
    case "firefox": {
      const encoded = encodeURIComponent(url);
      await Linking.openURL(`firefox://open-url?url=${encoded}`);
      return;
    }
    case "edge": {
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`microsoft-edge-https://${withoutScheme}`);
      return;
    }
    case "brave": {
      const encoded = encodeURIComponent(url);
      await Linking.openURL(`brave://open-url?url=${encoded}`);
      return;
    }
    case "duckDuckGo": {
      const withoutScheme = url.replace(/^https?:\/\//, "");
      await Linking.openURL(`ddgQuickLink://${withoutScheme}`);
      return;
    }
    case "systemDefault":
    default: {
      await Linking.openURL(url);
      return;
    }
  }
}
