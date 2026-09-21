import { CatalystWeeklyTheme } from "@/models/sdk-types";
import { atom } from "jotai";

export const themeAtom = atom<CatalystWeeklyTheme | null>(null);
