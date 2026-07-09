import { API_KEY } from "@/constants/apikey";
import { CatalystTS } from "@natsuneko-laboratory/catalyst-sdk";
import type { Interceptor } from "@natsuneko-laboratory/catalyst-sdk";
import * as SecureStore from "expo-secure-store";
import { getDefaultStore } from "jotai";
import { accountAtom } from "@/models/atoms/account";

export type Credential = {
  accessToken: string;
  refreshToken: string;
  client: CatalystTS;
};

export const EMPTY_CREDENTIAL = {
  accessToken: "",
  refreshToken: "",
  client: new CatalystTS({
    clientId: API_KEY.clientId ?? "",
    clientSecret: API_KEY.clientSecret ?? "",
    accessToken: "",
    refreshToken: "",
  }),
} satisfies Credential;

const KEYCHAIN_KEY_ACCESS_TOKEN = "access_token";
const KEYCHAIN_KEY_REFRESH_TOKEN = "refresh_token";

export const getCredential = async (): Promise<Credential> => {
  const accessToken = await SecureStore.getItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN);

  if (accessToken && refreshToken) {
    // CatalystTS は 401 を検知すると内部で自動的にトークンをリフレッシュして
    // リクエストをリトライする。ここでは、リフレッシュ後のトークンを
    // SecureStore と accountAtom に反映するだけでよい。
    let client: CatalystTS;
    let lastPersistedAccessToken = accessToken;

    const persistTokensInterceptor: Interceptor = {
      onResponse: async (response) => {
        const newAccessToken = client.accessToken;
        const newRefreshToken = client.refreshToken;

        if (newAccessToken && newRefreshToken && newAccessToken !== lastPersistedAccessToken) {
          lastPersistedAccessToken = newAccessToken;
          await saveCredential({ accessToken: newAccessToken, refreshToken: newRefreshToken });

          const store = getDefaultStore();
          const account = store.get(accountAtom);
          if (account) {
            store.set(accountAtom, {
              ...account,
              credential: {
                ...account.credential,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              },
            });
          }
        }

        return response;
      },
    };

    client = new CatalystTS({
      accessToken,
      refreshToken,
      clientId: API_KEY.clientId ?? "",
      clientSecret: API_KEY.clientSecret ?? "",
      interceptors: [persistTokensInterceptor],
    });

    return {
      client,
      accessToken,
      refreshToken,
    };
  }

  return EMPTY_CREDENTIAL;
};

export const saveCredential = async (credential: Omit<Credential, "client">): Promise<void> => {
  await SecureStore.setItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN, credential.accessToken);
  await SecureStore.setItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN, credential.refreshToken);
};

export const clear = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYCHAIN_KEY_REFRESH_TOKEN);
};
