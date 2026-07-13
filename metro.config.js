const path = require("node:path");
const { withUniwindConfig } = require("uniwind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

config.resolver.assetExts.push("txt");

// Local `link:` dependencies (e.g. fleet-renderer, developed as a sibling repo) live outside this
// project's directory tree, so Metro won't watch them or find this project's node_modules (for
// their peer deps like react-native-web) by default. Once these packages are consumed via a real
// npm version instead of `link:`, this block becomes a no-op.
const linkedPackageRoots = ["../fleet-renderer"].map((relativePath) => path.resolve(__dirname, relativePath));

config.watchFolders = [...(config.watchFolders ?? []), ...linkedPackageRoots];
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.resolve(__dirname, "node_modules"),
];

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "uniwind-types.d.ts",
});
