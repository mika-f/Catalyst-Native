import { API_KEY } from "@/constants/apikey";
import { ApiError, CatalystTS } from "@natsuneko-laboratory/catalyst-sdk";
import type { RequestInterceptor } from "@natsuneko-laboratory/catalyst-sdk";
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
    let client: CatalystTS;
    let isRefreshing = false;

    const refreshInterceptor: RequestInterceptor = {
      async adapt(request) {
        return request;
      },
      async retry(_request, error) {
        if (isRefreshing) return false;
        if (!(error instanceof ApiError) || error.statusCode !== 401) return false;

        isRefreshing = true;
        try {
          const newTokens = await client.refresh();
          await saveCredential({ accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken });

          const store = getDefaultStore();
          const account = store.get(accountAtom);
          if (account) {
            store.set(accountAtom, {
              ...account,
              credential: {
                ...account.credential,
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
              },
            });
          }

          return true;
        } catch {
          return false;
        } finally {
          isRefreshing = false;
        }
      },
    };

    client = new CatalystTS({
      accessToken,
      refreshToken,
      clientId: API_KEY.clientId ?? "",
      clientSecret: API_KEY.clientSecret ?? "",
      interceptors: [refreshInterceptor],
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
