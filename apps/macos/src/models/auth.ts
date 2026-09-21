import { accountAtom } from "@/atoms/account";
import * as CredentialStore from "@/models/credential-store";
import { PKCE } from "@natsuneko-laboratory/catalyst-sdk";
import { getDefaultStore } from "jotai";
import { Linking } from "react-native";

// Info.plist の CFBundleURLSchemes と、Catalyst 側に登録したリダイレクト URI と一致させる
export const REDIRECT_URI = "com.natsuneko.catalyst://authorize";

const fetchMe = async (credential: CredentialStore.Credential) => {
  const { data } = await credential.client.egeria.v1.me.get({ throwOnError: true });
  return data?.user;
};

// 起動時に Keychain のトークンからセッションを復元する (失効していれば CatalystTS 側で refresh される)
export const restore = async (): Promise<boolean> => {
  const credential = await CredentialStore.getCredential();
  if (!credential.accessToken) return false;

  try {
    const user = await fetchMe(credential);
    if (!user) return false;
    getDefaultStore().set(accountAtom, { user, credential });
    return true;
  } catch (e) {
    console.error("restore failed", e);
    await CredentialStore.clear();
    return false;
  }
};

const waitForRedirect = () =>
  new Promise<URL>((resolve) => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (!url.startsWith(REDIRECT_URI)) return;
      sub.remove();
      resolve(new URL(url));
    });
  });

// OAuth PKCE: 既定のブラウザで認可画面を開き、カスタム URL スキームでコードを受け取る
export const login = async (): Promise<boolean> => {
  const { client } = CredentialStore.EMPTY_CREDENTIAL;
  const pkce = await PKCE.create();
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const redirected = waitForRedirect();
  await Linking.openURL(client.oauth.getAuthorizeURL(REDIRECT_URI, pkce, state).toString());
  const url = await redirected;

  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== state) return false;

  const token = await client.oauth.getAccessTokenByCode(code, REDIRECT_URI, pkce);
  await CredentialStore.saveCredential(token);
  return restore();
};

export const logout = async () => {
  await CredentialStore.clear();
  getDefaultStore().set(accountAtom, null);
};
