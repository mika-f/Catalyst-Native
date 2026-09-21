import { Credential } from "@/models/credential-store";
import type { EgeriaUser } from "@/models/sdk-types";
import { atom } from "jotai";

type Account = {
  user: EgeriaUser;
  credential: Credential;
};

export const accountAtom = atom<Account | null>(null);
