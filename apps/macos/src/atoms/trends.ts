import { CatalystTrend } from "@/models/sdk-types";
import { atom } from "jotai";

export const trendsAtom = atom<CatalystTrend[]>([]);
