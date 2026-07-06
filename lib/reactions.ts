import type { CatalystReaction } from "@natsuneko-laboratory/catalyst-sdk";

const CUSTOM_REACTION_KEY_PREFIX = "custom:";

export const isCustomReactionKey = (key: string) =>
  key.startsWith(CUSTOM_REACTION_KEY_PREFIX);

export const getReactionKey = (symbol: string, customReactionId?: string) =>
  customReactionId ? `${CUSTOM_REACTION_KEY_PREFIX}${customReactionId}` : symbol;

export const getCustomReactionId = (key: string, reaction: CatalystReaction) =>
  reaction.customReactionId ??
  (isCustomReactionKey(key) ? key.slice(CUSTOM_REACTION_KEY_PREFIX.length) : undefined);
