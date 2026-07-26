import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * アニメーションを減らすかどうかの設定。
 * - system: OS のアクセシビリティ設定 (視差効果を減らす / アニメーションの削除) に従う
 * - on/off: OS 設定を無視してアプリ側で強制する
 */
export type ReduceMotionPreference = "system" | "on" | "off";

/**
 * Fleet の自動送りの速さ。
 * - standard: 6 秒 (既定)
 * - slow: 12 秒。読むのに時間がかかる場合向け
 * - manual: 自動で進めず、タップしたときだけ次に進む
 */
export type FleetPace = "standard" | "slow" | "manual";

/** Fleet 1 枚あたりの表示時間 (ミリ秒)。null は自動送りをしないことを表す */
export const FLEET_PACE_DURATIONS: Record<FleetPace, number | null> = {
  standard: 1000 * 6,
  slow: 1000 * 12,
  manual: null,
};

const STORAGE_KEYS = {
  reduceMotion: "accessibility_reduce_motion",
  haptics: "accessibility_haptics_enabled",
  underlineLinks: "accessibility_underline_links",
  boostTextContrast: "accessibility_boost_text_contrast",
  fleetPace: "accessibility_fleet_pace",
} as const;

export async function loadReduceMotionPreference(): Promise<ReduceMotionPreference> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.reduceMotion);
  if (value === "system" || value === "on" || value === "off") return value;
  return "system";
}

export async function saveReduceMotionPreference(preference: ReduceMotionPreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.reduceMotion, preference);
}

export async function loadHapticsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.haptics);
  return value !== "false";
}

export async function saveHapticsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.haptics, enabled ? "true" : "false");
}

export async function loadUnderlineLinks(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.underlineLinks);
  return value === "true";
}

export async function saveUnderlineLinks(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.underlineLinks, enabled ? "true" : "false");
}

export async function loadBoostTextContrast(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.boostTextContrast);
  return value === "true";
}

export async function saveBoostTextContrast(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.boostTextContrast, enabled ? "true" : "false");
}

export async function loadFleetPace(): Promise<FleetPace> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.fleetPace);
  if (value === "standard" || value === "slow" || value === "manual") return value;
  return "standard";
}

export async function saveFleetPace(pace: FleetPace): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.fleetPace, pace);
}
