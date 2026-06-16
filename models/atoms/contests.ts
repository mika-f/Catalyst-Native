import type { CatalystContest } from "@natsuneko-laboratory/catalyst-sdk";
import { atom } from "jotai";

export const contestSpotlightAtom = atom<CatalystContest[]>([]);
