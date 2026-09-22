import type { ReduceMotionPreference } from "@/models/accessibility-settings";
import { atom } from "jotai";

export const reduceMotionPreferenceAtom = atom<ReduceMotionPreference>("system");
export const underlineLinksAtom = atom(false);
export const boostTextContrastAtom = atom(false);
