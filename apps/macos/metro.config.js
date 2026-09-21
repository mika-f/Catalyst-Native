const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "../..");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  serializer: {
    // The default resolves InitializeCore from upstream react-native, which lacks the .macos files.
    getModulesRunBeforeMainModule: () => [require.resolve("react-native-macos/Libraries/Core/InitializeCore")],
  },
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(workspaceRoot, "node_modules")],
    disableHierarchicalLookup: true,
  },
};

const uniwindConfig = withUniwindConfig(mergeConfig(getDefaultConfig(__dirname), config), {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});

// Mirror the "@/*" -> "./src/*" path mapping from tsconfig.json, which Metro does not read.
// This wraps uniwind's resolver from the outside so that the resolver chain it builds is left untouched.
const baseResolveRequest = uniwindConfig.resolver.resolveRequest;

uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    return baseResolveRequest(context, path.resolve(__dirname, "src", moduleName.slice(2)), platform);
  }
  // Upstream react-native has no .macos variants (e.g. ReactDevToolsSettingsManager), so redirect to react-native-macos.
  if (platform === "macos" && (moduleName === "react-native" || moduleName.startsWith("react-native/"))) {
    return baseResolveRequest(context, moduleName.replace(/^react-native/, "react-native-macos"), platform);
  }
  return baseResolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
