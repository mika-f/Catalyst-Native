// @ts-check
const { withDangerousMod, withInfoPlist, withPlugins, withPodfile, withXcodeProject } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Mac Catalyst では利用できず、署名時に "provisioning profile doesn't support" で
 * 失敗する iOS 専用 entitlement。macOS 用 entitlements からは取り除く。
 */
const IOS_ONLY_ENTITLEMENTS = [
  "com.apple.developer.networking.wifi-info",
  "com.apple.developer.networking.HotspotConfiguration",
  "com.apple.external-accessory.wireless-configuration",
];

/**
 * Mac App Store 配信に必要な App Sandbox と、アプリが実際に使う機能の許可。
 * - network.client: API 通信
 * - files.user-selected.read-write: 画像の選択・保存
 * - assets.pictures.read-write: 写真ライブラリ (expo-media-library / image picker)
 */
const SANDBOX_ENTITLEMENTS = {
  "com.apple.security.app-sandbox": true,
  "com.apple.security.network.client": true,
  "com.apple.security.files.user-selected.read-write": true,
  "com.apple.security.assets.pictures.read-write": true,
};

/**
 * @typedef {object} MacCatalystProps
 * @property {string} [deploymentTarget] MACOSX_DEPLOYMENT_TARGET。既定は "14.0"
 * @property {string} [bundleIdentifier] macOS 版の bundle identifier。既定は iOS と同一 (ユニバーサル購入)
 * @property {string} [applicationCategory] LSApplicationCategoryType。既定は social-networking
 * @property {Record<string, unknown>} [entitlements] macOS 用 entitlements の追加・上書き
 */

/** @param {unknown} value @param {number} depth @returns {string} */
function serializePlistValue(value, depth) {
  const indent = "\t".repeat(depth);

  if (typeof value === "boolean") return `${indent}<${value}/>`;
  if (typeof value === "number") return `${indent}<integer>${value}</integer>`;
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}<array/>`;
    const items = value.map((item) => serializePlistValue(item, depth + 1)).join("\n");
    return `${indent}<array>\n${items}\n${indent}</array>`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return `${indent}<dict/>`;
    const items = entries
      .map(([key, item]) => `${"\t".repeat(depth + 1)}<key>${escapeXml(key)}</key>\n${serializePlistValue(item, depth + 1)}`)
      .join("\n");
    return `${indent}<dict>\n${items}\n${indent}</dict>`;
  }

  return `${indent}<string>${escapeXml(String(value))}</string>`;
}

/** @param {string} value */
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** @param {Record<string, unknown>} entitlements */
function serializeEntitlements(entitlements) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    serializePlistValue(entitlements, 0),
    "</plist>",
    "",
  ].join("\n");
}

/**
 * react_native_post_install に :mac_catalyst_enabled => true を渡す。
 * これにより CocoaPods が bundle の署名設定と iOSSupport の swift 検索パスを macOS 向けに補正する。
 *
 * @param {string} contents
 */
function enableMacCatalystInPodfile(contents) {
  const existing = /(:mac_catalyst_enabled\s*=>\s*)(?:true|false)/;
  if (existing.test(contents)) {
    return contents.replace(existing, "$1true");
  }

  const anchor = /(react_native_post_install\(\s*\n(\s*)installer,\s*\n\s*config\[:reactNativePath\],\s*\n)/;
  if (!anchor.test(contents)) {
    throw new Error(
      "[with-mac-catalyst] Podfile の react_native_post_install 呼び出しを見つけられませんでした。" +
        "prebuild テンプレートの変更により Mac Catalyst の Pod 設定が適用できません。",
    );
  }

  return contents.replace(anchor, (_match, head, indent) => `${head}${indent}:mac_catalyst_enabled => true,\n`);
}

const DISABLE_PODS_CODESIGN_MARKER = "with-mac-catalyst: disable codesign for Pod libraries";

/**
 * Xcode の自動署名解決は、`DEVELOPMENT_TEAM` をコマンドラインで渡しただけでも、
 * 明示的な signing style (ProvisioningStyle) を持たない全ターゲットに対して証明書探索を
 * 始めてしまう。CocoaPods が生成する Pods.xcodeproj の各ターゲットは signing style を
 * 明示しないため、アプリ本体をローカルの開発証明書で署名しようとしただけで、静的ライブラリの
 * はずの Pod ターゲットまで "No 'Mac Development' signing certificate found" で軒並み
 * 失敗する。
 *
 * ほとんどの Pod は静的ライブラリで署名が不要なので、まとめて無効化する。
 * リソースバンドル (product_type == bundle) だけは対象から外す — react_native_post_install
 * の apply_mac_catalyst_patches が個別にアドホック署名 (`CODE_SIGN_IDENTITY[sdk=macosx*] = '-'`)
 * を設定しており、そちらを優先させる。
 *
 * @param {string} contents
 */
function disableCodeSigningForPodLibraries(contents) {
  if (contents.includes(DISABLE_PODS_CODESIGN_MARKER)) return contents;

  const anchor = /(post_install do \|installer\|\n)/;
  if (!anchor.test(contents)) {
    throw new Error(
      "[with-mac-catalyst] Podfile の post_install ブロックを見つけられませんでした。" +
        "prebuild テンプレートの変更により Mac Catalyst の署名設定が適用できません。",
    );
  }

  const injected = [
    `    # ${DISABLE_PODS_CODESIGN_MARKER}`,
    "    installer.pods_project.targets.each do |target|",
    "      next if target.respond_to?(:product_type) && target.product_type == 'com.apple.product-type.bundle'",
    "",
    "      target.build_configurations.each do |config|",
    "        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'",
    "        config.build_settings['CODE_SIGNING_REQUIRED'] = 'NO'",
    "      end",
    "    end",
    "",
    "",
  ].join("\n");

  return contents.replace(anchor, (match) => `${match}${injected}`);
}

/** @type {import('expo/config-plugins').ConfigPlugin<MacCatalystProps>} */
const withMacCatalystPodfile = (config) =>
  withPodfile(config, (config) => {
    config.modResults.contents = enableMacCatalystInPodfile(config.modResults.contents);
    config.modResults.contents = disableCodeSigningForPodLibraries(config.modResults.contents);
    return config;
  });

/** @type {import('expo/config-plugins').ConfigPlugin<MacCatalystProps>} */
const withMacCatalystEntitlements = (config, props) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const { platformProjectRoot, projectName } = config.modRequest;
      if (!projectName) throw new Error("[with-mac-catalyst] projectName を解決できませんでした。");

      const iosEntitlements = { ...(config.ios?.entitlements ?? {}) };
      for (const key of IOS_ONLY_ENTITLEMENTS) delete iosEntitlements[key];

      const associatedDomains = config.ios?.associatedDomains ?? [];
      const bundleIdentifier = props.bundleIdentifier ?? config.ios?.bundleIdentifier;

      /** @type {Record<string, unknown>} */
      const entitlements = {
        ...iosEntitlements,
        ...SANDBOX_ENTITLEMENTS,
        ...(associatedDomains.length > 0 ? { "com.apple.developer.associated-domains": associatedDomains } : {}),
        // Mac Catalyst は iOS と違い、Keychain Sharing がないと Keychain 自体にアクセスできない
        // (expo-secure-store の保存・読み出しがすべて失敗する)
        ...(bundleIdentifier ? { "keychain-access-groups": [`$(AppIdentifierPrefix)${bundleIdentifier}`] } : {}),
        ...(props.entitlements ?? {}),
      };

      const filePath = path.join(platformProjectRoot, projectName, `${projectName}-macOS.entitlements`);
      fs.writeFileSync(filePath, serializeEntitlements(entitlements));

      return config;
    },
  ]);

/** @type {import('expo/config-plugins').ConfigPlugin<MacCatalystProps>} */
const withMacCatalystBuildSettings = (config, props) =>
  withXcodeProject(config, (config) => {
    const { projectName } = config.modRequest;
    const project = config.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    const macBundleIdentifier = props.bundleIdentifier;
    let patched = 0;

    for (const { buildSettings } of Object.values(configurations ?? {})) {
      // アプリターゲットの設定だけを対象にする (プロジェクト共通設定は PRODUCT_NAME を持たない)
      if (buildSettings?.PRODUCT_NAME === undefined) continue;

      buildSettings.SUPPORTS_MACCATALYST = "YES";
      // YES だと bundle identifier に maccatalyst. が前置される旧挙動になる
      buildSettings.DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER = "NO";
      buildSettings.MACOSX_DEPLOYMENT_TARGET = props.deploymentTarget ?? "14.0";
      buildSettings['"CODE_SIGN_ENTITLEMENTS[sdk=macosx*]"'] = `"${projectName}/${projectName}-macOS.entitlements"`;

      if (macBundleIdentifier) {
        buildSettings['"PRODUCT_BUNDLE_IDENTIFIER[sdk=macosx*]"'] = `"${macBundleIdentifier}"`;
      }

      patched++;
    }

    console.log(`[with-mac-catalyst] Patched ${patched} build configurations`);

    return config;
  });

/** @type {import('expo/config-plugins').ConfigPlugin<MacCatalystProps>} */
const withMacCatalystInfoPlist = (config, props) =>
  withInfoPlist(config, (config) => {
    // Mac App Store への提出に必須
    config.modResults.LSApplicationCategoryType =
      props.applicationCategory ?? "public.app-category.social-networking";
    return config;
  });

/** @type {import('expo/config-plugins').ConfigPlugin<MacCatalystProps | void>} */
const withMacCatalyst = (config, props) =>
  withPlugins(config, [
    [withMacCatalystPodfile, props ?? {}],
    [withMacCatalystEntitlements, props ?? {}],
    [withMacCatalystBuildSettings, props ?? {}],
    [withMacCatalystInfoPlist, props ?? {}],
  ]);

module.exports = withMacCatalyst;
