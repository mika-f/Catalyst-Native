import { EMPTY_CREDENTIAL } from "@/models/credential-store";
import { selectAtom } from "jotai/utils";
import { accountAtom } from "./account";

export const credentialAtom = selectAtom(accountAtom, (w) => w?.credential ?? EMPTY_CREDENTIAL);
export const clientAtom = selectAtom(accountAtom, (w) => w?.credential?.client ?? EMPTY_CREDENTIAL.client);
