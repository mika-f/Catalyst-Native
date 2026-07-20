import { resetSecureStoreMock } from "@/test/helpers/secure-store";
import { accountAtom } from "@/models/atoms/account";
import type { EgeriaUser } from "@/models/sdk-types";
import { CatalystTS } from "@natsuneko-laboratory/catalyst-sdk";
import AsyncStorage from "expo-secure-store";
import { getDefaultStore } from "jotai";
import { EMPTY_CREDENTIAL, clear, getCredential, saveCredential } from "./credential-store";

jest.mock("expo-secure-store");
jest.mock("@natsuneko-laboratory/catalyst-sdk");

type MockCatalystTSClass = typeof CatalystTS & {
  instances: Array<{
    opts: { accessToken?: string; refreshToken?: string; clientId: string; clientSecret: string };
    interceptors: Array<{ onResponse?: (response: unknown) => Promise<unknown> }>;
    _accessToken?: string;
    _refreshToken?: string;
  }>;
};

const MockedCatalystTS = CatalystTS as unknown as MockCatalystTSClass;

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

describe("credential-store", () => {
  beforeEach(() => {
    resetSecureStoreMock();
    MockedCatalystTS.instances = [];
    getDefaultStore().set(accountAtom, null);
  });

  describe("getCredential", () => {
    it("トークン未保存時は EMPTY_CREDENTIAL を返す", async () => {
      const credential = await getCredential();

      expect(credential).toBe(EMPTY_CREDENTIAL);
    });

    it("トークンが保存済みなら SecureStore の値で CatalystTS を構築する", async () => {
      await AsyncStorage.setItemAsync(ACCESS_TOKEN_KEY, "saved-access");
      await AsyncStorage.setItemAsync(REFRESH_TOKEN_KEY, "saved-refresh");

      const credential = await getCredential();

      expect(credential.accessToken).toBe("saved-access");
      expect(credential.refreshToken).toBe("saved-refresh");
      expect(MockedCatalystTS.instances).toHaveLength(1);
      expect(MockedCatalystTS.instances[0].opts).toMatchObject({
        accessToken: "saved-access",
        refreshToken: "saved-refresh",
      });
    });

    it("アクセストークンのみ保存されている場合は EMPTY_CREDENTIAL を返す (片方だけでは復元しない)", async () => {
      await AsyncStorage.setItemAsync(ACCESS_TOKEN_KEY, "saved-access");

      const credential = await getCredential();

      expect(credential).toBe(EMPTY_CREDENTIAL);
    });

    it("内部で発行された新しいトークンを SecureStore へ永続化する (自動リフレッシュの反映)", async () => {
      await AsyncStorage.setItemAsync(ACCESS_TOKEN_KEY, "old-access");
      await AsyncStorage.setItemAsync(REFRESH_TOKEN_KEY, "old-refresh");

      await getCredential();

      const instance = MockedCatalystTS.instances[0];
      expect(instance.interceptors).toHaveLength(1);

      // CatalystTS が内部で 401 を検知し、自動的にトークンをリフレッシュしたことを模擬する
      instance._accessToken = "refreshed-access";
      instance._refreshToken = "refreshed-refresh";
      await instance.interceptors[0].onResponse?.({});

      expect(await AsyncStorage.getItemAsync(ACCESS_TOKEN_KEY)).toBe("refreshed-access");
      expect(await AsyncStorage.getItemAsync(REFRESH_TOKEN_KEY)).toBe("refreshed-refresh");
    });

    it("アクセストークンが変化していなければ再永続化しない", async () => {
      await AsyncStorage.setItemAsync(ACCESS_TOKEN_KEY, "old-access");
      await AsyncStorage.setItemAsync(REFRESH_TOKEN_KEY, "old-refresh");

      await getCredential();

      const instance = MockedCatalystTS.instances[0];
      const setItemSpy = jest.spyOn(AsyncStorage, "setItemAsync");
      setItemSpy.mockClear();

      await instance.interceptors[0].onResponse?.({});

      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it("accountAtom にログイン中のユーザーがいれば新しいトークンを反映する", async () => {
      await AsyncStorage.setItemAsync(ACCESS_TOKEN_KEY, "old-access");
      await AsyncStorage.setItemAsync(REFRESH_TOKEN_KEY, "old-refresh");

      const credential = await getCredential();
      const store = getDefaultStore();
      store.set(accountAtom, {
        user: { id: "user-1" } as EgeriaUser,
        credential,
      });

      const instance = MockedCatalystTS.instances[0];
      instance._accessToken = "refreshed-access";
      instance._refreshToken = "refreshed-refresh";
      await instance.interceptors[0].onResponse?.({});

      const account = store.get(accountAtom);
      expect(account?.credential.accessToken).toBe("refreshed-access");
      expect(account?.credential.refreshToken).toBe("refreshed-refresh");
    });
  });

  describe("saveCredential", () => {
    it("アクセストークンとリフレッシュトークンを SecureStore に保存する", async () => {
      await saveCredential({ accessToken: "a", refreshToken: "b" });

      expect(await AsyncStorage.getItemAsync(ACCESS_TOKEN_KEY)).toBe("a");
      expect(await AsyncStorage.getItemAsync(REFRESH_TOKEN_KEY)).toBe("b");
    });
  });

  describe("clear", () => {
    it("両方のトークンを削除する", async () => {
      await saveCredential({ accessToken: "a", refreshToken: "b" });
      await clear();

      expect(await AsyncStorage.getItemAsync(ACCESS_TOKEN_KEY)).toBeNull();
      expect(await AsyncStorage.getItemAsync(REFRESH_TOKEN_KEY)).toBeNull();
    });
  });
});
