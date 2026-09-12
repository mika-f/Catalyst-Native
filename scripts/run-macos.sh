#!/usr/bin/env bash
#
# Mac Catalyst 版を Debug ビルドして起動する。`pnpm run:ios` の macOS 版。
# expo run:* は Mac Catalyst の destination を扱えないため xcodebuild を直接叩く。
#
# JS は Metro から読み込むので、別ターミナルで `pnpm start` を起動しておくこと。
#
# 必須:
#   APPLE_TEAM_ID  署名に使う Apple Developer の Team ID。
#                  `security find-identity -v -p codesigning` で手元の証明書を確認できる。
#
# macOS 版には App Sandbox / Keychain Sharing の entitlements が付くため、
# アドホック署名では起動できない (entitlements を埋め込むには development/distribution
# 証明書での署名が必須)。ローカル実行にも Apple Developer アカウントの Team ID が要る。
#
set -euo pipefail

# CocoaPods は非 UTF-8 ロケールで `Pod::Config#installation_root` 内の
# `unicode_normalize` が `Encoding::CompatibilityError` を起こしてクラッシュする
# (ターミナルの LANG 設定に依存するため、シェルによっては再現しない)。
# `expo prebuild` が内部で呼ぶ `pod install` にも波及するので、ここで明示的に
# UTF-8 ロケールへ固定する。
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

if [[ -z "${APPLE_TEAM_ID:-}" ]]; then
  echo "APPLE_TEAM_ID が設定されていません。" >&2
  echo "手元の署名用証明書は次のコマンドで確認できます:" >&2
  echo "  security find-identity -v -p codesigning" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT/ios/build-macos"
APP_PATH="$BUILD_DIR/Build/Products/Debug-maccatalyst/Catalyst.app"

npx expo prebuild --platform ios

# CODE_SIGN_STYLE は明示しない。app ターゲット自体は pbxproj 側で signing style を
# 指定していないため Xcode の既定 (Automatic 相当) で解決される。Pods 側は
# plugins/with-mac-catalyst.js の Podfile パッチで署名自体を無効化してあるので、
# DEVELOPMENT_TEAM をコマンドラインに渡しても Pod ライブラリまで証明書探索に
# 巻き込まれない。
#
# -allowProvisioningUpdates は、このマシン・この bundle identifier の組み合わせで
# 初めてビルドするときに Mac Catalyst App Development 用のプロビジョニングプロファイルを
# 自動生成させるために必要。Xcode に Apple ID がサインインされていないと
# 「No Accounts: Add a new account in Accounts settings.」で失敗する
# (Xcode → Settings → Accounts から追加する。パスワード入力が要るのでこのスクリプトからは
# 自動化できない)。
xcodebuild \
  -workspace "$ROOT/ios/Catalyst.xcworkspace" \
  -scheme Catalyst \
  -configuration Debug \
  -destination "platform=macOS,variant=Mac Catalyst,arch=$(uname -m)" \
  -derivedDataPath "$BUILD_DIR" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  build

open "$APP_PATH"
