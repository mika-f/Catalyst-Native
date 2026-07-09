import type { CatalystContest } from "@/models/sdk-types";
import { atom } from "jotai";

export const contestSpotlightAtom = atom<CatalystContest[]>([]);
