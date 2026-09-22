import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "hide_sensitive_content";

export const loadHideSensitiveContent = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === "true";
};

export const saveHideSensitiveContent = async (enabled: boolean) => {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
};
