import AsyncStorage from "@react-native-async-storage/async-storage";

type MockedAsyncStorage = {
  __INTERNAL_MOCK_STORE__: () => Record<string, string>;
};

// __mocks__/@react-native-async-storage/async-storage.js の in-memory ストアは
// モジュールスコープで共有されるため、テストファイル内で毎回リセットする。
// 呼び出し側で `jest.mock("@react-native-async-storage/async-storage")` を
// 先に行っておくこと。
export const resetAsyncStorageMock = () => {
  const store = (AsyncStorage as unknown as MockedAsyncStorage).__INTERNAL_MOCK_STORE__();
  for (const key of Object.keys(store)) {
    delete store[key];
  }
};
