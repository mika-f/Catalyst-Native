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
const UniImage = withUniwind(Image);

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
    <View className="flex-row flex-wrap items-center gap-1.5 py-1">
      {entries
        .filter(([, reaction]) => reaction.count >= 1)
        .map(([key, reaction]) => {
          const customReactionId = getCustomReactionId(key, reaction);
          const canToggle = Boolean(onReact || onUnreact);

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${reaction.symbol} ${reaction.count}件のリアクション`}
              disabled={!canToggle}
              onPress={() =>
                reaction.hasSelfReaction
                  ? onUnreact?.(reaction.symbol, customReactionId)
                  : onReact?.(reaction.symbol, reaction.url, customReactionId)
              }
              className={cn(
                "min-h-8 flex-row items-center gap-1 rounded-full border px-2 py-1 active:opacity-75 disabled:opacity-60",
                reaction.hasSelfReaction
                  ? "border-light-toggle-border bg-light-toggle dark:border-dark-toggle-border dark:bg-dark-toggle"
                  : "border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface-muted",
              )}
            >
              {isUnicodeCodepoint(reaction.symbol) ? (
                <UniImage
                  source={emojis[reaction.symbol as keyof typeof emojis]}
                  className="size-5"
                  contentFit="contain"
                />
              ) : (
                <UniImage
                  source={{ uri: reaction.url }}
                  className="size-5"
                  contentFit="contain"
                />
              )}
              <Text
                className={cn(
                  "text-[13px] font-semibold leading-none",
                  reaction.hasSelfReaction
                    ? "text-light-toggle-foreground dark:text-dark-toggle-foreground"
                    : "text-light-text-muted dark:text-dark-text-muted",
                )}
              >
                {reaction.count}
              </Text>
            </Pressable>
          );
        })}
      {onAddReaction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="リアクションを追加"
          onPress={onAddReaction}
          className="min-h-8 min-w-8 items-center justify-center rounded-full border border-light-divider bg-light-surface px-2 active:opacity-75 dark:border-dark-divider dark:bg-dark-surface-muted"
        >
          <UniPlus size={17} className="text-light-icon dark:text-dark-icon" />
        </Pressable>
      ) : null}
    </View>
  );
};
