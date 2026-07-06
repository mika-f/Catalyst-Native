import { emojis } from "@/lib/emojis";
import { getCustomReactionId } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import type { CatalystReaction } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniPlus = withUniwind(Plus);

const isUnicodeCodepoint = (symbol: string): boolean => {
  return /^[0-9a-f]+$/i.test(symbol) && symbol in emojis;
};

type Props = {
  reactions: Record<string, CatalystReaction>;
  onReact?: (symbol: string, url?: string, customReactionId?: string) => void;
  onUnreact?: (symbol: string, customReactionId?: string) => void;
  onAddReaction?: () => void;
};

export const ReactionBar = ({ reactions, onReact, onUnreact, onAddReaction }: Props) => {
  const entries = Object.entries(reactions);

  return (
    <View className="flex-row flex-wrap gap-2 py-1">
      {entries
        .filter(([, reaction]) => reaction.count >= 1)
        .map(([key, reaction]) => {
          const customReactionId = getCustomReactionId(key, reaction);

          return (
            <Pressable
              key={key}
              disabled={!onReact && !onUnreact}
              onPress={() =>
                reaction.hasSelfReaction
                  ? onUnreact?.(reaction.symbol, customReactionId)
                  : onReact?.(reaction.symbol, reaction.url, customReactionId)
              }
              className={cn(
                "flex-row items-center gap-1 px-2.5 py-1 rounded-full border",
                reaction.hasSelfReaction
                  ? "border-light-toggle-border dark:border-dark-toggle-border bg-light-toggle-active dark:bg-dark-toggle-active"
                  : "border-light-border dark:border-dark-border",
              )}
            >
              {isUnicodeCodepoint(reaction.symbol) ? (
                <Image
                  source={emojis[reaction.symbol as keyof typeof emojis]}
                  style={{ width: 24, height: 24 }}
                  contentFit="contain"
                />
              ) : (
                <Image
                  source={{ uri: reaction.url }}
                  style={{ width: 24, height: 24 }}
                  contentFit="contain"
                />
              )}
              <Text className="text-base text-light-text dark:text-dark-text">{reaction.count}</Text>
            </Pressable>
          );
        })}
      {onAddReaction && (
        <Pressable
          onPress={onAddReaction}
          className="items-center justify-center px-2.5 py-1 rounded-full border border-light-border dark:border-dark-border"
        >
          <UniPlus size={20} className="text-light-icon dark:text-dark-icon" />
        </Pressable>
      )}
    </View>
  );
};
