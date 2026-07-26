import { useHaptics } from "@/hooks/use-haptics";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";
import { withUniwind } from "uniwind";

const UniPlus = withUniwind(Plus);

type Props = {
  onPress: () => void;
};

export function FloatingActionButton({ onPress }: Props) {
  const haptics = useHaptics();

  return (
    <Pressable
      onPressIn={() => {
        if (process.env.EXPO_OS === "ios") {
          haptics.impact(Haptics.ImpactFeedbackStyle.Light);
        }
      }}
      onPress={onPress}
      className="absolute bottom-4 right-4 h-14 w-14 items-center justify-center rounded-full bg-light-accent dark:bg-dark-accent"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
      accessibilityLabel="新しい投稿を作成"
    >
      <UniPlus size={24} className="text-light-accent-foreground dark:text-dark-accent-foreground" />
    </Pressable>
  );
}
