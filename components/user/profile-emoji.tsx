import type { ProfileEmoji as ProfileEmojiType } from "@/models/sdk-types";
import { Image } from "expo-image";
import { Text } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type Props = {
  emoji?: ProfileEmojiType | null;
  size?: number;
};

export const ProfileEmoji = ({ emoji, size = 18 }: Props) => {
  if (!emoji) return null;

  if (emoji.imageUrl) {
    return (
      <UniImage
        source={{ uri: emoji.imageUrl }}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel={emoji.type === "custom" ? emoji.displayName : emoji.value}
      />
    );
  }

  if (emoji.type === "standard") {
    return (
      <Text className="text-light-text dark:text-dark-text" style={{ fontSize: size, lineHeight: size + 2 }}>
        {emoji.value}
      </Text>
    );
  }

  return null;
};
