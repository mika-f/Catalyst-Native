import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { openBrowserAsync } from "expo-web-browser";
import { Linking } from "react-native";
import { loadSelectedBrowser, openUrlWithBrowser, saveSelectedBrowser } from "./browser-settings";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { AUTOMATIC: "automatic" },
}));

jest.spyOn(Linking, "openURL").mockResolvedValue(true);

const URL = "https://catalyst.natsuneko.com/status/123";

describe("browser settings storage", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  it("未保存時のデフォルトは systemDefault", async () => {
    expect(await loadSelectedBrowser()).toBe("systemDefault");
  });

  it("保存/読込が往復する", async () => {
    await saveSelectedBrowser("chrome");
    expect(await loadSelectedBrowser()).toBe("chrome");
  });

  it("未知の値が保存されていた場合は systemDefault にフォールバックする", async () => {
    await AsyncStorage.setItem("selected_browser", "netscape-navigator");

    expect(await loadSelectedBrowser()).toBe("systemDefault");
  });
});

describe("openUrlWithBrowser", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  it("systemDefault は Linking.openURL をそのまま呼ぶ", async () => {
    await openUrlWithBrowser(URL, "systemDefault");

    expect(Linking.openURL).toHaveBeenCalledWith(URL);
  });

  it("inApp は expo-web-browser の openBrowserAsync を使う", async () => {
    await openUrlWithBrowser(URL, "inApp");

    expect(openBrowserAsync).toHaveBeenCalledWith(URL, expect.objectContaining({ presentationStyle: "automatic" }));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("chrome は https スキームを googlechromes:// に変換する", async () => {
    await openUrlWithBrowser(URL, "chrome");

    expect(Linking.openURL).toHaveBeenCalledWith("googlechromes://catalyst.natsuneko.com/status/123");
  });

  it("chrome は http スキームを googlechrome:// に変換する", async () => {
    await openUrlWithBrowser("http://example.com/foo", "chrome");

    expect(Linking.openURL).toHaveBeenCalledWith("googlechrome://example.com/foo");
  });

  it("firefox は URL 全体を encode してカスタムスキームに渡す", async () => {
    await openUrlWithBrowser(URL, "firefox");

    expect(Linking.openURL).toHaveBeenCalledWith(
      `firefox://open-url?url=${encodeURIComponent(URL)}`,
    );
  });

  it("edge はスキームを除去して microsoft-edge-https:// を付与する", async () => {
    await openUrlWithBrowser(URL, "edge");

    expect(Linking.openURL).toHaveBeenCalledWith(
      "microsoft-edge-https://catalyst.natsuneko.com/status/123",
    );
  });

  it("brave は URL 全体を encode する", async () => {
    await openUrlWithBrowser(URL, "brave");

    expect(Linking.openURL).toHaveBeenCalledWith(`brave://open-url?url=${encodeURIComponent(URL)}`);
  });

  it("duckDuckGo はスキームを除去してカスタムスキームを付与する", async () => {
    await openUrlWithBrowser(URL, "duckDuckGo");

    expect(Linking.openURL).toHaveBeenCalledWith(
      "ddgQuickLink://catalyst.natsuneko.com/status/123",
    );
  });

  it("browserKey 省略時は保存済みの選択ブラウザーを使う", async () => {
    await saveSelectedBrowser("inApp");

    await openUrlWithBrowser(URL);

    expect(openBrowserAsync).toHaveBeenCalled();
  });
});
