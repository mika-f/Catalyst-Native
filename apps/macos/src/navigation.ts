import { createNavigationRef } from "@natsuneko-laboratory/react-native-desktop-navigation/native";

export type SettingsCategory =
  | "account"
  | "display"
  | "notifications"
  | "privacy"
  | "accessibility"
  | "reactions"
  | "activitypub"
  | "legal";

export type RootParams = {
  Main: undefined;
  Settings: { category?: SettingsCategory } | undefined;
};

export const NavigationRef = createNavigationRef<RootParams>();
