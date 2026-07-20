// テスト用の手動モック。`jest.mock("@natsuneko-laboratory/catalyst-sdk")` で
// 明示的に opt-in したテストでのみ使われる。
// 実際の HTTP 通信は行わず、コンストラクタに渡された値の検査と、
// egeria/oauth/refresh の呼び出しをテストごとに差し替え可能にする。
class MockCatalystTS {
  constructor(opts) {
    this.opts = opts;
    this._accessToken = opts.accessToken;
    this._refreshToken = opts.refreshToken;
    this.interceptors = opts.interceptors ?? [];
    this.refresh = jest.fn();
    this.oauth = {
      getAuthorizeURL: jest.fn(),
      getAccessTokenByCode: jest.fn(),
    };
    this.egeria = { v1: { me: { get: jest.fn() } } };
    MockCatalystTS.instances.push(this);
  }

  get accessToken() {
    return this._accessToken;
  }

  get refreshToken() {
    return this._refreshToken;
  }
}
MockCatalystTS.instances = [];

class MockPKCE {}
MockPKCE.create = jest.fn().mockResolvedValue({
  verifier: "mock-verifier",
  challenge: "mock-challenge",
  method: "S256",
});

module.exports = {
  CatalystTS: MockCatalystTS,
  PKCE: MockPKCE,
};
