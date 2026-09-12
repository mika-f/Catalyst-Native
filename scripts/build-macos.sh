#!/usr/bin/env bash
#
# Mac Catalyst 版を Release ビルドし、App Store Connect 提出用の .pkg を書き出す。
#
# EAS Build は Mac Catalyst をビルドできないため、ここだけローカルの xcodebuild を直接使う。
# iOS 版と同じ bundle identifier を使うので、App Store Connect 上は同一アプリの
# macOS プラットフォームとして (ユニバーサル購入で) 配信される。
#
# 必須:
#   APPLE_TEAM_ID  Apple Developer の Team ID (10 文字)
# 任意:
#   BUILD_NUMBER   CFBundleVersion。未指定なら Info.plist の値をそのまま使う
#   CONFIGURATION  既定は Release
#
set -euo pipefail

# CocoaPods は非 UTF-8 ロケールで `Pod::Config#installation_root` 内の
# `unicode_normalize` が `Encoding::CompatibilityError` を起こしてクラッシュする
# (ターミナルの LANG 設定に依存するため、シェルによっては再現しない)。
# `expo prebuild` が内部で呼ぶ `pod install` にも波及するので、ここで明示的に
# UTF-8 ロケールへ固定する。
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/ios/build-macos"
ARCHIVE_PATH="$BUILD_DIR/Catalyst.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
EXPORT_OPTIONS="$BUILD_DIR/ExportOptions.plist"
CONFIGURATION="${CONFIGURATION:-Release}"

if [[ -z "${APPLE_TEAM_ID:-}" ]]; then
  echo "APPLE_TEAM_ID が設定されていません。Apple Developer の Team ID を指定してください。" >&2
  exit 1
fi

echo "==> expo prebuild (Mac Catalyst 設定を生成)"
# expo prebuild は NODE_ENV を development に倒すため、明示しないと
# entitlements の aps-environment が development のまま焼き込まれる
APP_ENV="${APP_ENV:-production}" npx expo prebuild --platform ios

if [[ -n "${BUILD_NUMBER:-}" ]]; then
  echo "==> CFBundleVersion を $BUILD_NUMBER に設定"
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$ROOT/ios/Catalyst/Info.plist"
fi

echo "==> archive ($CONFIGURATION / arm64 + x86_64)"
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"
xcodebuild \
  -workspace "$ROOT/ios/Catalyst.xcworkspace" \
  -scheme Catalyst \
  -configuration "$CONFIGURATION" \
  -destination 'generic/platform=macOS,variant=Mac Catalyst' \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$BUILD_DIR" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  archive

cat > "$EXPORT_OPTIONS" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>destination</key>
	<string>export</string>
	<key>teamID</key>
	<string>$APPLE_TEAM_ID</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
PLIST

echo "==> exportArchive"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$EXPORT_PATH"

echo
echo "完了: $EXPORT_PATH"
ls -la "$EXPORT_PATH"
echo
echo "アップロード: pnpm submit:macos:appstore"
