import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import { loadStreamingEnabled, saveStreamingEnabled } from "./streaming-settings";

jest.mock("@react-native-async-storage/async-storage");

describe("streaming settings", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  // 他の設定と異なり、未保存時のデフォルトは true (opt-out 方式)
  it("未保存時のデフォルトは true", async () => {
    expect(await loadStreamingEnabled()).toBe(true);
  });

  it("保存/読込が往復する", async () => {
    await saveStreamingEnabled(false);
    expect(await loadStreamingEnabled()).toBe(false);

    await saveStreamingEnabled(true);
    expect(await loadStreamingEnabled()).toBe(true);
  });
});
