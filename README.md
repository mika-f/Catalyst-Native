# Catalyst for React Native

[Catalyst](https://catalyst.natsuneko.com) のネイティブクライアント実装です。
[Expo](https://expo.dev) / [expo-router](https://docs.expo.dev/router/introduction/) をベースに、iOS / Android 向けのソーシャルネットワーククライアントとして開発されています。

> [!NOTE]
> このリポジトリは [CatalystSDK](https://github.com/mika-f/CatalystSDK) を利用して構築されています。
> プロジェクトの詳細な技術情報は [AGENTS.md](./AGENTS.md) を参照してください。

## 主な機能

- タイムライン（ホーム / グローバル）の閲覧と投稿
- ステータスへのリアクション・返信・共有
- ユーザープロフィール・フォロー管理
- アルバム / スマートアルバム / ギャラリー
- コンテスト機能
- 通知
- OAuth 2.0 (PKCE) による認証

## 技術スタック

| 領域                 | 採用技術                                                                                |
| -------------------- | --------------------------------------------------------------------------------------- |
| フレームワーク       | [Expo](https://expo.dev) (SDK 56) / React Native 0.85 / React 19                        |
| ルーティング         | [expo-router](https://docs.expo.dev/router/introduction/)（ファイルベースルーティング） |
| スタイリング         | [Uniwind](https://docs.uniwind.dev/)（React Native 向け Tailwind CSS v4）               |
| 状態管理             | [Jotai](https://jotai.org/)                                                             |
| API クライアント     | [`@natsuneko-laboratory/catalyst-sdk`](https://github.com/mika-f/CatalystSDK)           |
| リスト描画           | [@shopify/flash-list](https://shopify.github.io/flash-list/)                            |
| エラーモニタリング   | [Sentry](https://sentry.io/)                                                            |
| パッケージマネージャ | [pnpm](https://pnpm.io/)                                                                |

## 必要な環境

- [Node.js](https://nodejs.org/) `v24.14.0`（`.node-version` を参照。[Volta](https://volta.sh/) や [fnm](https://github.com/Schniz/fnm) などの利用を推奨）
- [pnpm](https://pnpm.io/)
- iOS / macOS (Mac Catalyst) 開発: macOS + [Xcode](https://developer.apple.com/xcode/)
- Android 開発: [Android Studio](https://developer.android.com/studio)（SDK / エミュレータ）

実機・シミュレータのセットアップについては [Expo の環境構築ガイド](https://docs.expo.dev/get-started/set-up-your-environment/) を参照してください。

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/mika-f/Catalyst-Native.git
cd Catalyst-Native
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

`.env.sample` をコピーして `.env.local` を作成し、OAuth クライアントの認証情報を設定します。

```bash
cp .env.sample .env.local
```

```env
# Android 用 OAuth クライアント
EXPO_PUBLIC_CATALYST_FOR_ANDROID_CLIENT_ID=
EXPO_PUBLIC_CATALYST_FOR_ANDROID_CLIENT_SECRET=

# iOS 用 OAuth クライアント
EXPO_PUBLIC_CATALYST_FOR_IOS_CLIENT_ID=
EXPO_PUBLIC_CATALYST_FOR_IOS_CLIENT_SECRET=
```

クライアント ID / シークレットは [Catalyst のアプリケーション設定](https://accounts.natsuneko.com/settings/developer)から取得します。OAuth の挙動については [constants/apikey.ts](./constants/apikey.ts) を参照してください。

> [!TIP]
> リダイレクト URI はプラットフォームごとに固定です（iOS / 本番 Android: `com.natsuneko.catalyst://authorize`、開発 Android: `exp+catalyst-native://authorize`）。Catalyst 側のアプリケーション登録で同じ URI を許可しておく必要があります。

## 開発

### アプリの起動

ネイティブモジュールを含むため、Expo Go ではなく [Development Build](https://docs.expo.dev/develop/development-builds/introduction/) で実行します。

```bash
# iOS シミュレータで起動
pnpm run:ios

# Android エミュレータ／実機で起動
pnpm run:android

# Mac Catalyst 版を起動（別ターミナルで pnpm start が必要）
pnpm run:macos
```

上記コマンドは内部で `prebuilt`（絵文字・ライセンス一覧の生成）を実行したあと、`.env.local` を読み込んで `expo run:*` を起動します。

開発サーバーのみを起動する場合は以下を使います。

```bash
pnpm start
```

### Lint

```bash
pnpm lint
```

> [!NOTE]
> このプロジェクトには自動テストはありません。

## プロジェクト構成

```
app/            expo-router のルート定義（画面ごとのファイルベースルーティング）
  (drawer)/       ドロワー／タブナビゲーション
  status/         単一ステータス表示
  user/           ユーザープロフィール
  compose/        投稿作成
  album/, smart-album/, gallery/, contest/, settings/, ...
components/      画面を構成する UI コンポーネント
  ui/             汎用 UI 部品（プラットフォーム別は *.ios.tsx 等）
models/         Jotai atoms・認証情報・各種設定の状態管理
constants/      API キー・テーマなどの定数
lib/            ユーティリティ（dayjs・メディア・共有・クラス結合 など）
hooks/          カスタムフック
bin/            ビルド前生成スクリプト（絵文字・ライセンス一覧）
scripts/        補助スクリプト
assets/         画像・フォントなどの静的リソース
global.css      カラーパレット等のグローバルスタイル定義
```

詳細は [AGENTS.md](./AGENTS.md) を参照してください。

## ビルド・配布

ビルドと配布には [EAS (Expo Application Services)](https://docs.expo.dev/eas/) を利用します。プロファイルは [eas.json](./eas.json) に定義されています（`development` / `preview` / `production`）。

```bash
# ローカルでのプロダクションビルド
pnpm build:ios:production
pnpm build:android:production

# ストアへの提出
pnpm submit:ios:production
pnpm submit:android:production
```

### macOS (Mac Catalyst)

macOS 版は iOS のコードベースを [Mac Catalyst](https://developer.apple.com/mac-catalyst/) としてビルドしたものです。
必要な Xcode 設定（`SUPPORTS_MACCATALYST`、macOS 用 entitlements、CocoaPods の Catalyst 対応）は
[plugins/with-mac-catalyst.js](./plugins/with-mac-catalyst.js) が `expo prebuild` 時に生成するため、
`ios/` を手で編集する必要はありません。

EAS Build は Mac Catalyst をビルドできないため、ここだけローカルの `xcodebuild` を直接使います。

```bash
# .pkg の書き出しまで
APPLE_TEAM_ID=XXXXXXXXXX pnpm build:macos:appstore

# App Store Connect へアップロード
ASC_API_KEY_ID=... ASC_API_ISSUER_ID=... pnpm submit:macos:appstore
```

bundle identifier は iOS 版と同じ `com.natsuneko.catalyst` を使うため、App Store Connect 上では
同一アプリに macOS プラットフォームを追加する形（ユニバーサル購入）になります。
事前に Apple Developer 側で以下が必要です。

- App ID `com.natsuneko.catalyst` で Mac Catalyst を有効化する
- Mac App Store 用のプロビジョニングプロファイルと、`Apple Distribution` / `Mac Installer Distribution` 証明書
- App Store Connect の App Store Connect API キー（`~/.appstoreconnect/private_keys/` に配置）

> [!IMPORTANT]
> `@react-native-async-storage/async-storage` は 2.x に固定してください。3.x にすると macOS が
> ビルドできなくなります。理由と、バージョンを動かす場合に必要なデータ移行の手順は
> [AGENTS.md](./AGENTS.md) と [models/storage-migration.ts](./models/storage-migration.ts) を参照してください。

### macOS をローカルで動かす (`pnpm run:macos`)

macOS 版には App Sandbox / Keychain Sharing の entitlements が付くため、アドホック署名では
起動できません。ローカル実行にも Apple Developer アカウントでの署名が必須です。

```bash
# 別ターミナルで Metro を起動しておく
pnpm start

# Team ID を指定して実行 (初回ビルドは Mac Catalyst 用のプロビジョニングプロファイルを
# 自動生成するため少し時間がかかる)
APPLE_TEAM_ID=XXXXXXXXXX pnpm run:macos
```

初めてこのマシンでビルドする場合、Xcode に Apple ID がサインインされていないと
`No Accounts: Add a new account in Accounts settings.` で失敗します。
Xcode → Settings (⌘,) → Accounts タブ → 左下の「+」から Apple ID を追加してください。

`APPLE_TEAM_ID` は次のコマンドで手元の証明書から確認できます。

```bash
security find-identity -v -p codesigning
```

タグの push をトリガーとしたリリースワークフローは [.github/workflows/](./.github/workflows/) に定義されています。

## コーディング規約

外部コントリビューターの方は、以下の方針に沿った実装をお願いします。

- **スタイリング**: インラインスタイルや `StyleSheet` ではなく、Uniwind のユーティリティクラス（`className`）を使用してください。条件付きクラスは `clsx` / `tailwind-merge` で組み立てます。
- **カラー**: 色は [global.css](./global.css) に定義されたカラーパレットを使用し、各色のコメントに記載された用途に従ってください（直接の色指定は避けてください）。
- **状態管理**: グローバルステートは Jotai を使用します。
- **プラットフォーム差分**: プラットフォーム固有のコンポーネントは `*.ios.tsx` などのサフィックスで分割します。
- **UI の参考**: Twitter / Instagram / Mastodon の各公式アプリの体験を参考にしています。

## コントリビューション

1. このリポジトリを Fork します。
2. 作業用ブランチを作成します（`git switch -c feature/your-feature`）。
3. 変更を加え、`pnpm lint` が通ることを確認します。
4. Pull Request を `develop` ブランチ向けに作成します。

バグ報告や機能提案は [Issue](https://github.com/mika-f/Catalyst-Native/issues) からお願いします。

## 関連リポジトリ

- [CatalystSDK](https://github.com/mika-f/CatalystSDK) — API クライアント SDK
- [Catalyst](https://catalyst.natsuneko.com) — サービス本体

## トラブルシューティング

ビルド時にたまに出るエラー

### Distill failed for unknown

Expo が画像生成に失敗したケースに出ます。
`ios/Catalyst/Images.xcassets/SplashScreenLogo.imageset/image@3x.png` が壊れるケースが見かけられるので、同ディレクトリにある `image@2x.png` を `image@3x.png` としてコピーしてください。

## ライセンス

[MIT License](./LICENSE) のもとで公開されています。
