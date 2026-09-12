/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // react-native-worklets (react-native-reanimated 4 の依存) はネイティブバインディング無しでは
  // import できないため、jest では .native 拡張子の解決をスキップして JS 実装側を使わせる
  resolver: "react-native-worklets/jest/resolver.js",
  // node_modules 配下には ESM-only なパッケージ (unified/remark/rehype エコシステム,
  // @natsuneko-laboratory 系, uniwind など) が多く、許可リスト方式では網羅しきれない。
  // そのため既定の「node_modules は変換しない」を外し、babel プラグインとして
  // 直接 require される 2 パッケージだけを除外リストにする
  transformIgnorePatterns: [
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/.expo/", "/.claude/"],
  // .claude/worktrees 配下には作業中のワークツリー (= このリポジトリの複製) が置かれる。
  // testPathIgnorePatterns はテストの実行対象からは外すが haste-map の走査は止めないため、
  // __mocks__ が重複して古いワークツリー側のモックが優先されることがある。
  // モジュール解決の対象からも外す。
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "models/**/*.{ts,tsx}",
    "!lib/licenses.ts",
    "!lib/emojis.ts",
  ],
};
