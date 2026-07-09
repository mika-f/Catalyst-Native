import { API_KEY } from "@/constants/apikey";
import * as CredentialStore from "@/models/credential-store";
import type { EgeriaUser } from "@/models/sdk-types";
import { PKCE } from "@natsuneko-laboratory/catalyst-sdk";
import * as WebBrowser from "expo-web-browser";
import { v4 } from "uuid";

type AuthResult = {
  credential: CredentialStore.Credential;
  isLoggedIn: boolean;
  user: EgeriaUser | undefined;
};

/**
 * アプリ起動時に保存済みトークンからセッションを復元する。
 * OAuth フローは開始しない。
 */
export const tryRestore = async (): Promise<AuthResult> => {
  const credential = await CredentialStore.getCredential();

  if (credential.accessToken && credential.refreshToken) {
    try {
      const { data: me } = await credential.client.egeria.v1.me.get({
        throwOnError: true,
      });

      if (me?.user) {
        return { credential, isLoggedIn: true, user: me.user };
      }
    } catch {
      try {
        const newTokens = await credential.client.refresh();
        const { data: me } = await credential.client.egeria.v1.me.get({
          throwOnError: true,
        });

        if (me?.user) {
          await CredentialStore.saveCredential({
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
          });

          return {
            credential: {
              ...credential,
              accessToken: newTokens.accessToken,
              refreshToken: newTokens.refreshToken,
            },
            isLoggedIn: true,
            user: me.user,
          };
        }
      } catch (refreshErr) {
        console.error("Token refresh failed:", refreshErr);
      }
    }
  }

  // トークンが無い or 復元失敗 → 未ログイン状態で返す
  await logout();
  return {
    credential: CredentialStore.EMPTY_CREDENTIAL,
    isLoggedIn: false,
    user: undefined,
  };
};

/**
 * OAuth PKCE フローを開始してログインする。
 */
export const login = async (): Promise<AuthResult> => {
  const credential = await CredentialStore.getCredential();

  const pcke = await PKCE.create();
  const state = v4();
  const redirect = credential.client.oauth.getAuthorizeURL(
    API_KEY.redirectUri,
    pcke,
    state,
  );
  const result = await WebBrowser.openAuthSessionAsync(
    redirect.toString(),
    API_KEY.redirectUri,
    {
      preferEphemeralSession: true,
    },
  );

  if (result.type === "success" && result.url) {
    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (code && returnedState === state) {
      const token = await credential.client.oauth.getAccessTokenByCode(
        code,
        API_KEY.redirectUri,
        pcke,
      );
      await CredentialStore.saveCredential({ ...token });
      const newCredential = await CredentialStore.getCredential();

      try {
        const { data: me } = await newCredential.client.egeria.v1.me.get();

        if (me?.user) {
          return {
            credential: {
              ...newCredential,
              accessToken: token.accessToken,
              refreshToken: token.refreshToken,
            },
            isLoggedIn: true,
            user: me.user,
          };
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  return {
    credential: CredentialStore.EMPTY_CREDENTIAL,
    isLoggedIn: false,
    user: undefined,
  };
};

export const logout = async (): Promise<void> => {
  await CredentialStore.clear();
};
