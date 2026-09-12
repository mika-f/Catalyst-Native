import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";

/**
 * AsyncStorage 3.x → 2.x のデータ移行。
 *
 * macOS (Mac Catalyst) 対応のため AsyncStorage を 3.x から 2.x へ下げている。
 * 3.x の Apple 実装は Kotlin Multiplatform 製の `SharedAsyncStorage.framework` に依存しており、
 * この xcframework には Mac Catalyst スライスが無い (Kotlin/Native に Mac Catalyst ターゲットが
 * 存在しないため、上流が KMP をやめない限り増えない)。そのため Catalyst ではリンクできない。
 *
 * 2.x と 3.x はネイティブの保存先が別で、互いに読めない:
 *
 * | | 2.x が読む場所 | 3.x が読む場所 |
 * | --- | --- | --- |
 * | iOS | `RCTAsyncLocalStorage_V1/manifest.json` | 独自 SQLite |
 * | Android | SQLite `RKStorage` | Room `AsyncStorage` |
 *
 * 3.x の `getLegacyStorage()` は iOS では 2.x と同じ場所を指すが、Android では Room 側を
 * 指すため使えない。そこで、プラットフォームに依存しないファイル経由で受け渡す。
 *
 * リリース手順:
 *
 * 1. 3.x のまま {@link exportStorageSnapshot} を起動時に呼ぶリリースを出す
 * 2. 間隔を置いてから、2.x に下げて {@link importStorageSnapshot} を呼ぶリリース (macOS 対応) を出す
 *
 * 1 を飛ばしたユーザーは設定を引き継げず初期値に戻る (認証情報は `expo-secure-store` 側なので影響しない)。
 * どちらの関数も AsyncStorage の公開 API しか使わないので、2.x / 3.x 双方でそのまま動く。
 */

const SNAPSHOT_FILE = "async-storage-snapshot.json";

/** 取り込み済みマーカー。ユーザーが消した設定をスナップショットから復活させないために使う */
const IMPORTED_KEY = "async_storage_snapshot_imported";

/**
 * AsyncStorage の中身をすべてファイルに退避する。**3.x を積んだ中間リリースで呼ぶ。**
 *
 * 移行は best-effort で、失敗しても起動は妨げない。
 */
export async function exportStorageSnapshot(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length === 0) return;

    const entries = await AsyncStorage.multiGet(keys);
    const snapshot: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (value !== null) snapshot[key] = value;
    }

    const file = new File(Paths.document, SNAPSHOT_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(snapshot));
  } catch (e) {
    console.error("[storage-migration] スナップショットの書き出しに失敗しました:", e);
  }
}

/**
 * {@link exportStorageSnapshot} が残したファイルを AsyncStorage に取り込む。
 * **2.x に下げたリリースで、設定の読み込みより前に呼ぶ。**
 *
 * 既に値があるキーは上書きしない。取り込み後はファイルを削除する。
 */
export async function importStorageSnapshot(): Promise<void> {
  try {
    const file = new File(Paths.document, SNAPSHOT_FILE);
    if (!file.exists) return;

    // バックアップからの復元などでファイルが戻ってきた場合に、二度目を流さない
    if ((await AsyncStorage.getItem(IMPORTED_KEY)) !== null) {
      file.delete();
      return;
    }

    const snapshot: unknown = JSON.parse(await file.text());
    if (typeof snapshot !== "object" || snapshot === null) {
      throw new Error("スナップショットの形式が不正です");
    }

    const existing = new Set(await AsyncStorage.getAllKeys());
    const pairs = Object.entries(snapshot).filter(
      ([key, value]) => typeof value === "string" && !existing.has(key),
    ) as [string, string][];

    if (pairs.length > 0) await AsyncStorage.multiSet(pairs);

    await AsyncStorage.setItem(IMPORTED_KEY, "true");
    file.delete();
  } catch (e) {
    console.error("[storage-migration] スナップショットの取り込みに失敗しました:", e);
  }
}
