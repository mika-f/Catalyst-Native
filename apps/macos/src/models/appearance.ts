import AsyncStorage from "@react-native-async-storage/async-storage";
import { Uniwind } from "uniwind";

export type Appearance = "system" | "light" | "dark";

const STORAGE_KEY = "catalyst:appearance";

export const loadAppearance = async (): Promise<Appearance> => {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  if (value === "system" || value === "light" || value === "dark") return value;
  return "system";
};

export const applyAppearance = (value: Appearance) => {
  Uniwind.setTheme(value);
};

export const saveAppearance = async (value: Appearance) => {
  applyAppearance(value);
  await AsyncStorage.setItem(STORAGE_KEY, value);
};
