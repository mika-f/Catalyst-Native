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
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(workspaceRoot, "node_modules")],
    disableHierarchicalLookup: true,
    // The CLI normally injects the macOS defaults (this, the serializer below, and the react-native -> react-native-macos
    // redirect in resolveRequest) via setFrameworkDefaults(), but it does so on the hoisted @react-native/metro-config
    // instance, not the one this app resolves, so they must be declared here.
    platforms: ["ios", "android", "macos", "native"],
    // Kept inside uniwind's base resolver: uniwind matches the literal "react-native" specifier to swap in
    // its className-aware components, so the redirect must happen after that check, not before it.
    resolveRequest: (context, moduleName, platform) => {
      if (platform === "macos") {
        if (moduleName === "react-native") {
          moduleName = "react-native-macos";
        } else if (moduleName.startsWith("react-native/")) {
          moduleName = `react-native-macos/${moduleName.slice("react-native/".length)}`;
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
  serializer: {
    getModulesRunBeforeMainModule: () => [
      require.resolve("react-native-macos/Libraries/Core/InitializeCore", { paths: [__dirname] }),
    ],
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
  return baseResolveRequest(context, moduleName, platform);
};

module.exports = uniwindConfig;
