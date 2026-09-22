import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReduceMotionPreference = "system" | "on" | "off";

const STORAGE_KEYS = {
  reduceMotion: "accessibility_reduce_motion",
  underlineLinks: "accessibility_underline_links",
  boostTextContrast: "accessibility_boost_text_contrast",
} as const;

export const loadReduceMotionPreference = async (): Promise<ReduceMotionPreference> => {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.reduceMotion);
  if (value === "system" || value === "on" || value === "off") return value;
  return "system";
};

export const saveReduceMotionPreference = async (preference: ReduceMotionPreference) => {
  await AsyncStorage.setItem(STORAGE_KEYS.reduceMotion, preference);
};

export const loadUnderlineLinks = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem(STORAGE_KEYS.underlineLinks)) === "true";
};

export const saveUnderlineLinks = async (enabled: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEYS.underlineLinks, enabled ? "true" : "false");
};

export const loadBoostTextContrast = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem(STORAGE_KEYS.boostTextContrast)) === "true";
};

export const saveBoostTextContrast = async (enabled: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEYS.boostTextContrast, enabled ? "true" : "false");
};
