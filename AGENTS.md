# AGENTS.md

Catalyst-React-Nativ は、 CatalystSDK を使用して構築された [Catalyst](https://catalyst.natsuneko.com) のネイティブクライアント実装です。  
このドキュメントは、プロジェクトの構造、使用技術、開発フローなど、一般的なプロジェクト情報を提供します。CLAUDE.md には、Claude Code での作業に特化した指針を配置します。

## Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Start the dev server
pnpm start          # or: expo start

# Run on specific platform
pnpm android        # expo run:android
pnpm ios            # expo run:ios
pnpm web            # expo start --web

# Lint
pnpm lint           # expo lint
```

There are no automated tests in this project.

## Git / Commits

エージェントがコミットを作成するときは、コミットメッセージ本文の末尾に `Co-Authored-By` トレイラを付けてください。

```
Co-Authored-By: Grok <noreply@x.ai>
```

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

- 使用しているエージェントに応じた名前とメールを使う
- トレイラは本文と空行 1 行で区切る（Git trailer 形式）
- ユーザーが明示的に別形式を指定した場合はそれに従う

## アーキテクチャ

このプロジェクトは Expo と expo-router を使用した React Native モバイルアプリで、ソーシャルネットワーククライアント「Catalyst」の実装です。

### カラーパレット

Catalyst React Native では、カラーパレットを @global.css に定義しています。
特に理由がない限り、カラーパレットの定義とそのコメントから適切な使い方をして色を使ってください。

### SDK

このアプリは `@natsuneko-laboratory/catalyst-sdk` に依存しており、これは [CatalystSDK](https://github.com/mika-f/CatalystSDK) を指します。
SDK は `CatalystTS`（API クライアント）、`PKCE`、および `CatalystStatus`、`EgeriaUser` などの型を提供します。

### Fleet レンダリングエンジン

Fleet（24時間で消える、テキスト・画像・ステッカーをレイヤー合成できる投稿機能）のレイアウト計算は、[fleet-renderer](https://github.com/mika-f/fleet-renderer) という共有パッケージに切り出されています。React (`catalyst.natsuneko.com`)・React Native（このアプリ）・Server（`api.natsuneko.com` の satori ベースの PNG レンダラー）の3箇所で同じレイアウト数学（`{posX, posY, scale, rotation}` の正規化座標変換、コンテナクエリ単位、フォントマッピング、はみ出し防止クランプなど）を共有するための OSS 化を見据えたパッケージです。

- `@natsuneko-laboratory/fleet-renderer-core`: プラットフォーム非依存の型・定数・`resolveFleetLayout` レイアウトエンジン
- `@natsuneko-laboratory/fleet-renderer-react-native`: `FleetCanvas` コンポーネントと `useFleetContainer` フック

CDN URL 変換やステッカー画像URLの規約（`static.natsuneko.com/images/reactions/{symbol}.png`）などの Catalyst 固有ロジックはコアパッケージに含めず、[components/fleet/content.tsx](../components/fleet/content.tsx) の `resolveMediaUri`/`resolveStickerImageUrl` 経由でアプリ側から注入しています。

### macOS (Mac Catalyst)

macOS 版は iOS のコードベースを Mac Catalyst としてビルドしたものです。`ios/` は `expo prebuild` の
生成物で gitignore されているため、Xcode 側の設定は [plugins/with-mac-catalyst.js](plugins/with-mac-catalyst.js)
（config plugin）に持たせています。**`ios/` を直接編集しても次の prebuild で消えます。**

プラグインが行うこと:

- `SUPPORTS_MACCATALYST` / `MACOSX_DEPLOYMENT_TARGET` / `DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER` の設定
- Mac App Store 用の entitlements (`Catalyst-macOS.entitlements`) の生成
  - App Sandbox（Mac App Store 提出に必須）と、それに伴うネットワーク・写真・ファイルの許可
  - Keychain Sharing（Catalyst では iOS と違い、これがないと `expo-secure-store` が一切動かない）
  - Catalyst で使えない iOS 専用 entitlement（`networking.wifi-info` など）の除去
- Podfile の `react_native_post_install` に `:mac_catalyst_enabled => true` を渡す
- `LSApplicationCategoryType`（Mac App Store 提出に必須）の設定

bundle identifier は iOS 版と同一 (`com.natsuneko.catalyst`) です。ユニバーサル購入になるほか、
`GoogleService-Info.plist` の `BUNDLE_ID` と一致させる必要があるためでもあります。

#### AsyncStorage は 2.x に固定

**`@react-native-async-storage/async-storage` を 3.x に上げると macOS がビルドできなくなります。**
3.x の Apple 実装は Kotlin Multiplatform (+SKIE) でビルドされた `SharedAsyncStorage.framework` に
依存していますが、この xcframework のスライスは `ios` / `ios-simulator` / `macos` だけで、
Mac Catalyst スライスがありません。Kotlin/Native に Mac Catalyst ターゲットが存在しないため、
上流が KMP をやめない限り増えません。2.x はピュア Objective-C なので Catalyst で問題なく通ります。

なお 2.2.0 は Expo SDK 57 が `bundledNativeModules.json` で指定しているバージョンでもあります
(`npx expo install` が選ぶのは 2.2.0 です)。

2.x と 3.x はネイティブの保存先が異なり互いに読めないため、バージョンを動かす場合は
[models/storage-migration.ts](models/storage-migration.ts) のスナップショット受け渡しが必要です。
リリース順序もそこに書いてあります。

#### Sentry のパッチ

[patches/@sentry__react-native@8.21.0.patch](patches/@sentry__react-native@8.21.0.patch) は
Mac Catalyst で Sentry の xcframework スライス選択が誤る上流バグへの対処です。
`FRAMEWORK_SEARCH_PATHS[sdk=maccatalyst*]` という条件が使われていますが、Xcode に `maccatalyst`
という SDK 名は存在せず (Catalyst ビルドでも `SDK_NAME` は `macosx`)、この条件は一度も一致しません。
結果 UIKit を含まない macOS スライスが選ばれ、`SentryScreenFramesWrapper.m` がコンパイルエラーに
なります。パッチでは `IS_MACCATALYST` を挟んで `[sdk=macosx*]` の中で振り分けています。
Sentry を上げるときはこのパッチの当たり具合を確認してください。

Catalyst では `Platform.OS` は `"ios"` のままなので、分岐には `lib/device-layout.ts` の
`isMacCatalyst` を使ってください。UIKit の一部（`SFSafariViewController` = `openBrowserAsync` など）が
使えないため、該当箇所にはフォールバックが必要です。

### ステート管理

グローバルステートの管理には [Jotai](https://jotai.org/) を使用しています。

### 認証フロー

認証は [models/credential.ts](models/credential.ts) と [models/credential-store.ts](models/credential-store.ts) で管理されています：

- Credentials (アクセストークン/リフレッシュトークン) は `expo-secure-store`（キーチェーン）に保存されます。
- アプリのスタートアップ時に `Credential.init()` が保存されたトークンをチェックし、現在のユーザーの取得を試み、必要に応じてトークンをリフレッシュするか、`expo-web-browser` を介して OAuth PKCE フローを開始します。
- OAuth クライアントID/シークレットおよびリダイレクトURIはプラットフォーム固有で、[constants/apikey.ts](constants/apikey.ts) に定義されています。

### ルーティング

**expo-router** を使用したファイルベースのルーティング：

- `app/_layout.tsx` — ルートレイアウト、認証の初期化、全体を `GestureHandlerRootView` + `ThemeProvider` でラップ
- `app/(tabs)/` — ボトムタブナビゲーション（ホーム、検索、通知、プロフィール）。通知とプロフィールタブは認証時にのみ表示されます。
- `app/status/[id].tsx` — 単一投稿ビュー
- `app/user/[screenName].tsx` — ユーザープロフィールビュー
- `app/authorize.tsx` — 認証画面 (リダイレクト)

### スタイリング

基本的には [Uniwind](https://docs.uniwind.dev/)（React Native 向け Tailwind CSS）を使用し、`tailwind-merge` と `clsx` で条件付きクラスを管理しています。
**特に理由がない限り、スタイルはユーティリティクラスを使用して定義し、インラインスタイルおよび StyleSheet は使用しないでください。**
[llms-full.txt](https://docs.uniwind.dev/llms-full.txt) が提供されているので、必要に応じて活用してください。
グローバル CSS は `global.css` に配置されています。
プラットフォーム固有のコンポーネントバリアントは `.ios.tsx` サフィックスの慣習を使用しています（例: `components/ui/icon-symbol.ios.tsx`）。

### エラーモニタリング

Sentry は [app/\_layout.tsx](app/_layout.tsx) で初期化され、ルートコンポーネントは `Sentry.wrap(...)` でラップされています。

## 参考アプリ

このアプリは次のアプリの体験や UI を参考に実装されます。

- Twitter for iOS/Android
- Instagram for iOS/Android
- Mastodon for iOS/Android

## その他参考情報

### 既存アプリ (Swift/iOS 実装)

Catalyst iOS ネイティブ実装である Catalyst for iOS は、 `../Catalyst-for-iOS` ディレクトリに配置されており、任意のタイミングで参照することが出来ます。

### サーバー実装

Catalyst のバックエンド実装である teyvat は `../teyvat` ディレクトリに配置されており、それぞれ `../teyvat/README.md` に書かれたコンポーネントに応じて参照することが出来ます。

### twitter-text ネイティブ実装

twitter-text のネイティブ実装である react-native-twitter-text は `../react-native-twitter-text` ディレクトリに配置されており、任意のタイミングで参照することが出来ます。
