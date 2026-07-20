// テスト用の in-memory モック。`jest.mock("@react-native-async-storage/async-storage")`
// で明示的に opt-in したテストでのみ使われる (settings 系の永続化テスト用)。
let store = {};

const AsyncStorageMock = {
  getItem: jest.fn((key) => Promise.resolve(Object.hasOwn(store, key) ? store[key] : null)),
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),
  __INTERNAL_MOCK_STORE__: () => store,
};

module.exports = AsyncStorageMock;
module.exports.default = AsyncStorageMock;
