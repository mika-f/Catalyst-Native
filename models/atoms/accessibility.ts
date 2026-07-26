import { atom } from "jotai";
import type { FleetPace, ReduceMotionPreference } from "../accessibility-settings";

export const reduceMotionPreferenceAtom = atom<ReduceMotionPreference>("system");
/** OS 側の「動きを減らす」設定。ルートレイアウトの useSystemReducedMotionSync が更新する */
export const systemReduceMotionAtom = atom<boolean>(false);
export const hapticsEnabledAtom = atom<boolean>(true);
export const underlineLinksAtom = atom<boolean>(false);
export const boostTextContrastAtom = atom<boolean>(false);
export const fleetPaceAtom = atom<FleetPace>("standard");
