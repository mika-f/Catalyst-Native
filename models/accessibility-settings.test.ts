import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import {
  FLEET_PACE_DURATIONS,
  loadBoostTextContrast,
  loadFleetPace,
  loadHapticsEnabled,
  loadReduceMotionPreference,
  loadUnderlineLinks,
  saveBoostTextContrast,
  saveFleetPace,
  saveHapticsEnabled,
  saveReduceMotionPreference,
  saveUnderlineLinks,
} from "./accessibility-settings";

jest.mock("@react-native-async-storage/async-storage");

describe("accessibility settings", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  describe("動きを減らす", () => {
    it("未保存時のデフォルトは system (OS 設定に従う)", async () => {
      expect(await loadReduceMotionPreference()).toBe("system");
    });

    it("保存/読込が往復する", async () => {
      await saveReduceMotionPreference("on");
      expect(await loadReduceMotionPreference()).toBe("on");

      await saveReduceMotionPreference("off");
      expect(await loadReduceMotionPreference()).toBe("off");
    });
  });

  describe("触覚フィードバック", () => {
    it("未保存時のデフォルトは true (有効)", async () => {
      expect(await loadHapticsEnabled()).toBe(true);
    });

    it("保存/読込が往復する", async () => {
      await saveHapticsEnabled(false);
      expect(await loadHapticsEnabled()).toBe(false);

      await saveHapticsEnabled(true);
      expect(await loadHapticsEnabled()).toBe(true);
    });
  });

  describe("リンクの下線", () => {
    it("未保存時のデフォルトは false (下線なし)", async () => {
      expect(await loadUnderlineLinks()).toBe(false);
    });

    it("保存/読込が往復する", async () => {
      await saveUnderlineLinks(true);
      expect(await loadUnderlineLinks()).toBe(true);
    });
  });

  describe("文字のコントラスト", () => {
    it("未保存時のデフォルトは false (通常のコントラスト)", async () => {
      expect(await loadBoostTextContrast()).toBe(false);
    });

    it("保存/読込が往復する", async () => {
      await saveBoostTextContrast(true);
      expect(await loadBoostTextContrast()).toBe(true);
    });
  });

  describe("Fleet の表示時間", () => {
    it("未保存時のデフォルトは standard", async () => {
      expect(await loadFleetPace()).toBe("standard");
    });

    it("保存/読込が往復する", async () => {
      await saveFleetPace("slow");
      expect(await loadFleetPace()).toBe("slow");

      await saveFleetPace("manual");
      expect(await loadFleetPace()).toBe("manual");
    });

    it("manual は自動送りしないことを表す", () => {
      expect(FLEET_PACE_DURATIONS.manual).toBeNull();
      expect(FLEET_PACE_DURATIONS.standard).toBeGreaterThan(0);
      expect(FLEET_PACE_DURATIONS.slow).toBeGreaterThan(FLEET_PACE_DURATIONS.standard!);
    });
  });
});
