const { withUniwindConfig } = require("uniwind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push("txt");

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "uniwind-types.d.ts",
});
