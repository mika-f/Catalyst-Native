import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  enabled: "streaming_enabled",
} as const;

export async function loadStreamingEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS.enabled);
  return value !== "false";
}

export async function saveStreamingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.enabled, enabled ? "true" : "false");
}
