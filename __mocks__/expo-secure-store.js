// テスト用の in-memory モック。`jest.mock("expo-secure-store")` で明示的に
// opt-in したテストでのみ使われる。
let store = {};

module.exports = {
  getItemAsync: jest.fn((key) => Promise.resolve(Object.hasOwn(store, key) ? store[key] : null)),
  setItemAsync: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  __INTERNAL_MOCK_STORE__: () => store,
};
