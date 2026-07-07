import type { EgeriaUser } from "@/models/sdk-types";
import { atom } from "jotai";
import { Credential } from "../credential-store";

type Account = {
  user: EgeriaUser;
  credential: Credential;
};

export const accountAtom = atom<Account | null>(null);
