import type { CatalystReaction } from "@/models/sdk-types";
import { atom } from "jotai";
import { atomFamily } from "jotai-family";

// Per-status reaction cache. null = not yet overridden (fall back to server data).
export const reactionCacheAtomFamily = atomFamily((_statusId: string) =>
  atom<Record<string, CatalystReaction> | null>(null),
);
