import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  hideSensitiveContent: "hide_sensitive_content",
} as const;

export async function loadHideSensitiveContent(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.hideSensitiveContent);
  return value === "true";
}

export async function saveHideSensitiveContent(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.hideSensitiveContent,
    enabled ? "true" : "false",
  );
}
