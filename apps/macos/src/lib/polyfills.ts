import "@natsuneko-laboratory/react-native-webcrypto-digest";

// Hermes は crypto.getRandomValues を持たないため、PKCE / state 生成用に最低限の実装を差し込む。
// ponytail: Math.random ベースで暗号学的に安全ではない。react-native-get-random-values (macOS 対応) を入れたら置き換える
const g = globalThis as { crypto?: { getRandomValues?: <T extends ArrayBufferView>(a: T) => T } };
g.crypto ??= {};
g.crypto.getRandomValues ??= <T extends ArrayBufferView>(array: T): T => {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return array;
};
