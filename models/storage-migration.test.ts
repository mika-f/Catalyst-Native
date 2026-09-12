import { resetAsyncStorageMock } from "@/test/helpers/async-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import { exportStorageSnapshot, importStorageSnapshot } from "./storage-migration";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { document: "file:///documents" },
}));

/** ファイルシステムの代わりに使う、スナップショット 1 件ぶんの状態 */
let file: { content: string | null };

const mockedFile = jest.mocked(File);

beforeEach(() => {
  resetAsyncStorageMock();
  jest.clearAllMocks();
  file = { content: null };

  mockedFile.mockImplementation(
    () =>
      ({
        get exists() {
          return file.content !== null;
        },
        create: jest.fn(() => {
          file.content = "";
        }),
        write: jest.fn((content: string) => {
          file.content = content;
        }),
        text: jest.fn(() => Promise.resolve(file.content ?? "")),
        delete: jest.fn(() => {
          file.content = null;
        }),
      }) as unknown as File,
  );
});

describe("exportStorageSnapshot", () => {
  it("AsyncStorage の中身をすべて JSON として書き出す", async () => {
    await AsyncStorage.setItem("selected_browser", "chrome");
    await AsyncStorage.setItem("catalyst:privacy_settings", '{"a":1}');

    await exportStorageSnapshot();

    expect(JSON.parse(file.content as string)).toEqual({
      selected_browser: "chrome",
      "catalyst:privacy_settings": '{"a":1}',
    });
  });

  it("ストアが空なら何も書き出さない", async () => {
    await exportStorageSnapshot();

    expect(file.content).toBeNull();
  });
});

describe("importStorageSnapshot", () => {
  it("スナップショットを取り込んでファイルを削除する", async () => {
    file.content = JSON.stringify({ selected_browser: "firefox", fleet_pace: "slow" });

    await importStorageSnapshot();

    expect(await AsyncStorage.getItem("selected_browser")).toBe("firefox");
    expect(await AsyncStorage.getItem("fleet_pace")).toBe("slow");
    expect(file.content).toBeNull();
  });

  it("既に値があるキーは上書きしない", async () => {
    await AsyncStorage.setItem("selected_browser", "brave");
    file.content = JSON.stringify({ selected_browser: "firefox" });

    await importStorageSnapshot();

    expect(await AsyncStorage.getItem("selected_browser")).toBe("brave");
  });

  it("ファイルが無ければ何もしない", async () => {
    await importStorageSnapshot();

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it("取り込み済みならもう一度流さず、ファイルだけ削除する", async () => {
    file.content = JSON.stringify({ selected_browser: "firefox" });
    await importStorageSnapshot();

    // ユーザーが設定を消したあとにバックアップからファイルが戻ってきた状況
    await AsyncStorage.removeItem("selected_browser");
    file.content = JSON.stringify({ selected_browser: "firefox" });

    await importStorageSnapshot();

    expect(await AsyncStorage.getItem("selected_browser")).toBeNull();
    expect(file.content).toBeNull();
  });

  it("壊れた JSON でも例外を投げない", async () => {
    file.content = "{ not json";

    await expect(importStorageSnapshot()).resolves.toBeUndefined();
  });

  it("文字列でない値は無視する", async () => {
    file.content = JSON.stringify({ ok: "value", bad: 42 });

    await importStorageSnapshot();

    expect(await AsyncStorage.getItem("ok")).toBe("value");
    expect(await AsyncStorage.getItem("bad")).toBeNull();
  });
});
