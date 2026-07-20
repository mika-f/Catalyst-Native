import type { EgeriaUser } from "@/models/sdk-types";
import * as WebBrowser from "expo-web-browser";
import { v4 } from "uuid";
import { login, logout, tryRestore } from "./credential";
import * as CredentialStore from "./credential-store";

jest.mock("@natsuneko-laboratory/catalyst-sdk");
jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(),
}));
jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
jest.mock("./credential-store", () => ({
  EMPTY_CREDENTIAL: { accessToken: "", refreshToken: "", client: {} },
  getCredential: jest.fn(),
  saveCredential: jest.fn(),
  clear: jest.fn(),
}));

const mockedGetCredential = CredentialStore.getCredential as jest.Mock;
const mockedSaveCredential = CredentialStore.saveCredential as jest.Mock;
const mockedClear = CredentialStore.clear as jest.Mock;
const mockedOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;
const mockedV4 = v4 as jest.Mock;

const createFakeClient = () => ({
  oauth: {
    getAuthorizeURL: jest.fn().mockReturnValue(new URL("https://auth.example.com/authorize")),
    getAccessTokenByCode: jest.fn(),
  },
  egeria: { v1: { me: { get: jest.fn() } } },
  refresh: jest.fn(),
});

const USER = { id: "user-1" } as EgeriaUser;

beforeEach(() => {
  jest.clearAllMocks();
  // tryRestore/login はリフレッシュ失敗時などに意図的に console.error でログを残す。
  // テスト出力を汚さないためにここで抑制する。
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("tryRestore", () => {
  it("有効なトークンで me の取得に成功すればログイン状態で復元する", async () => {
    const client = createFakeClient();
    const credential = { accessToken: "a", refreshToken: "r", client };
    mockedGetCredential.mockResolvedValue(credential);
    client.egeria.v1.me.get.mockResolvedValue({ data: { user: USER } });

    const result = await tryRestore();

    expect(result).toEqual({ credential, isLoggedIn: true, user: USER });
    expect(mockedClear).not.toHaveBeenCalled();
  });

  it("me の取得が失敗しても refresh が成功すれば復元し、新しいトークンを永続化する", async () => {
    const client = createFakeClient();
    const credential = { accessToken: "old-a", refreshToken: "old-r", client };
    mockedGetCredential.mockResolvedValue(credential);
    client.egeria.v1.me.get.mockRejectedValueOnce(new Error("401")).mockResolvedValueOnce({
      data: { user: USER },
    });
    client.refresh.mockResolvedValue({ accessToken: "new-a", refreshToken: "new-r" });

    const result = await tryRestore();

    expect(mockedSaveCredential).toHaveBeenCalledWith({ accessToken: "new-a", refreshToken: "new-r" });
    expect(result.isLoggedIn).toBe(true);
    expect(result.credential.accessToken).toBe("new-a");
    expect(result.credential.refreshToken).toBe("new-r");
    expect(result.user).toEqual(USER);
  });

  it("me の取得も refresh も失敗すればログアウトして未ログイン状態を返す", async () => {
    const client = createFakeClient();
    const credential = { accessToken: "old-a", refreshToken: "old-r", client };
    mockedGetCredential.mockResolvedValue(credential);
    client.egeria.v1.me.get.mockRejectedValue(new Error("401"));
    client.refresh.mockRejectedValue(new Error("refresh failed"));

    const result = await tryRestore();

    expect(mockedClear).toHaveBeenCalled();
    expect(result).toEqual({
      credential: CredentialStore.EMPTY_CREDENTIAL,
      isLoggedIn: false,
      user: undefined,
    });
  });

  it("me の取得に成功しても user が空なら未ログインで終わる (不正なレスポンス)", async () => {
    const client = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "a", refreshToken: "r", client });
    client.egeria.v1.me.get.mockResolvedValue({ data: {} });

    const result = await tryRestore();

    expect(mockedClear).toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
  });

  it("refresh 後の me 取得に成功しても user が空なら未ログインで終わる", async () => {
    const client = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "a", refreshToken: "r", client });
    client.egeria.v1.me.get.mockRejectedValueOnce(new Error("401")).mockResolvedValueOnce({ data: {} });
    client.refresh.mockResolvedValue({ accessToken: "new-a", refreshToken: "new-r" });

    const result = await tryRestore();

    expect(mockedSaveCredential).not.toHaveBeenCalled();
    expect(mockedClear).toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
  });

  it("トークンが保存されていなければログアウトして未ログイン状態を返す", async () => {
    const client = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "", refreshToken: "", client });

    const result = await tryRestore();

    expect(mockedClear).toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
    expect(client.egeria.v1.me.get).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  beforeEach(() => {
    mockedV4.mockReturnValue("expected-state");
  });

  it("正常なフローでログインし、新しいトークンを永続化する", async () => {
    const initialClient = createFakeClient();
    const newClient = createFakeClient();
    mockedGetCredential
      .mockResolvedValueOnce({ accessToken: "", refreshToken: "", client: initialClient })
      .mockResolvedValueOnce({ accessToken: "new-a", refreshToken: "new-r", client: newClient });

    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "com.natsuneko.catalyst://authorize?code=auth-code&state=expected-state",
    });
    initialClient.oauth.getAccessTokenByCode.mockResolvedValue({
      accessToken: "new-a",
      refreshToken: "new-r",
    });
    newClient.egeria.v1.me.get.mockResolvedValue({ data: { user: USER } });

    const result = await login();

    expect(initialClient.oauth.getAccessTokenByCode).toHaveBeenCalledWith(
      "auth-code",
      expect.any(String),
      expect.objectContaining({ verifier: "mock-verifier" }),
    );
    expect(mockedSaveCredential).toHaveBeenCalledWith({ accessToken: "new-a", refreshToken: "new-r" });
    expect(result.isLoggedIn).toBe(true);
    expect(result.user).toEqual(USER);
    expect(result.credential.accessToken).toBe("new-a");
  });

  it("state が一致しない場合はトークン交換を行わず未ログインで終わる (CSRF対策)", async () => {
    const initialClient = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "", refreshToken: "", client: initialClient });
    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "com.natsuneko.catalyst://authorize?code=auth-code&state=tampered-state",
    });

    const result = await login();

    expect(initialClient.oauth.getAccessTokenByCode).not.toHaveBeenCalled();
    expect(mockedSaveCredential).not.toHaveBeenCalled();
    expect(result).toEqual({
      credential: CredentialStore.EMPTY_CREDENTIAL,
      isLoggedIn: false,
      user: undefined,
    });
  });

  it("ブラウザがキャンセルされた場合は未ログインで終わる", async () => {
    const initialClient = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "", refreshToken: "", client: initialClient });
    mockedOpenAuthSessionAsync.mockResolvedValue({ type: "cancel" });

    const result = await login();

    expect(initialClient.oauth.getAccessTokenByCode).not.toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
  });

  it("コールバック URL に code が無ければ未ログインで終わる", async () => {
    const initialClient = createFakeClient();
    mockedGetCredential.mockResolvedValue({ accessToken: "", refreshToken: "", client: initialClient });
    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "com.natsuneko.catalyst://authorize?state=expected-state",
    });

    const result = await login();

    expect(initialClient.oauth.getAccessTokenByCode).not.toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
  });

  it("トークン交換後の me 取得に成功しても user が空なら未ログインで終わる", async () => {
    const initialClient = createFakeClient();
    const newClient = createFakeClient();
    mockedGetCredential
      .mockResolvedValueOnce({ accessToken: "", refreshToken: "", client: initialClient })
      .mockResolvedValueOnce({ accessToken: "new-a", refreshToken: "new-r", client: newClient });
    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "com.natsuneko.catalyst://authorize?code=auth-code&state=expected-state",
    });
    initialClient.oauth.getAccessTokenByCode.mockResolvedValue({
      accessToken: "new-a",
      refreshToken: "new-r",
    });
    newClient.egeria.v1.me.get.mockResolvedValue({ data: {} });

    const result = await login();

    expect(result.isLoggedIn).toBe(false);
  });

  it("トークン交換後の me 取得に失敗しても未ログインで終わる (例外を握りつぶして返す)", async () => {
    const initialClient = createFakeClient();
    const newClient = createFakeClient();
    mockedGetCredential
      .mockResolvedValueOnce({ accessToken: "", refreshToken: "", client: initialClient })
      .mockResolvedValueOnce({ accessToken: "new-a", refreshToken: "new-r", client: newClient });
    mockedOpenAuthSessionAsync.mockResolvedValue({
      type: "success",
      url: "com.natsuneko.catalyst://authorize?code=auth-code&state=expected-state",
    });
    initialClient.oauth.getAccessTokenByCode.mockResolvedValue({
      accessToken: "new-a",
      refreshToken: "new-r",
    });
    newClient.egeria.v1.me.get.mockRejectedValue(new Error("network error"));

    const result = await login();

    expect(mockedSaveCredential).toHaveBeenCalled();
    expect(result.isLoggedIn).toBe(false);
  });
});

describe("logout", () => {
  it("CredentialStore.clear を呼ぶ", async () => {
    await logout();

    expect(mockedClear).toHaveBeenCalled();
  });
});
