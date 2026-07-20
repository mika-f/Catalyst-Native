import AsyncStorage from "expo-secure-store";

type MockedSecureStore = {
  __INTERNAL_MOCK_STORE__: () => Record<string, string>;
};

// __mocks__/expo-secure-store.js の in-memory ストアはモジュールスコープで
// 共有されるため、テストファイル内で毎回リセットする。呼び出し側で
// `jest.mock("expo-secure-store")` を先に行っておくこと。
export const resetSecureStoreMock = () => {
  const store = (AsyncStorage as unknown as MockedSecureStore).__INTERNAL_MOCK_STORE__();
  for (const key of Object.keys(store)) {
    delete store[key];
  }
};
