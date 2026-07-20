import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import { loadHideSensitiveContent, saveHideSensitiveContent } from "./sensitive-content-settings";

jest.mock("@react-native-async-storage/async-storage");

describe("sensitive content settings", () => {
  beforeEach(() => {
    resetAsyncStorageMock();
  });

  it("未保存時のデフォルトは false (表示する)", async () => {
    expect(await loadHideSensitiveContent()).toBe(false);
  });

  it("保存/読込が往復する", async () => {
    await saveHideSensitiveContent(true);
    expect(await loadHideSensitiveContent()).toBe(true);

    await saveHideSensitiveContent(false);
    expect(await loadHideSensitiveContent()).toBe(false);
  });
});
