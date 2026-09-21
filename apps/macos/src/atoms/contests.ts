import { CatalystContest } from "@/models/sdk-types";
import { atom } from "jotai";

export const contestsAtom = atom<CatalystContest[]>([]);
