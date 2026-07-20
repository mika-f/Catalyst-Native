import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadTimelineImageQuality,
  loadWifiUpgrade,
  saveTimelineImageQuality,
  saveWifiUpgrade,
} from "./image-quality-settings";

jest.mock("@react-native-async-storage/async-storage");

describe("image quality settings", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  it("未保存時のデフォルトは low", async () => {
    expect(await loadTimelineImageQuality()).toBe("low");
  });

  it("保存した値をそのまま読み込める (シリアライズ往復)", async () => {
    await saveTimelineImageQuality("medium");
    expect(await loadTimelineImageQuality()).toBe("medium");
  });

  it("不正な値が保存されていた場合は low にフォールバックする", async () => {
    // AsyncStorage に想定外の値が入っているケース (旧バージョンからの移行など)
    await AsyncStorage.setItem("timeline_image_quality", "invalid");

    expect(await loadTimelineImageQuality()).toBe("low");
  });

  it("wifiUpgrade は未保存時 false", async () => {
    expect(await loadWifiUpgrade()).toBe(false);
  });

  it("wifiUpgrade の保存/読込が往復する", async () => {
    await saveWifiUpgrade(true);
    expect(await loadWifiUpgrade()).toBe(true);

    await saveWifiUpgrade(false);
    expect(await loadWifiUpgrade()).toBe(false);
  });
});
