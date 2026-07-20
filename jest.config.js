/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  // jest-expo のデフォルトに @natsuneko-laboratory (ESM 配布) などを追加したもの
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@natsuneko-laboratory|uniwind|lucide-react-native))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/**/*.test.ts", "<rootDir>/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/ios/", "/android/", "/.expo/"],
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "models/**/*.{ts,tsx}",
    "!lib/licenses.ts",
    "!lib/emojis.ts",
  ],
};
