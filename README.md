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
- iOS 開発: macOS + [Xcode](https://developer.apple.com/xcode/)
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

## ライセンス

[MIT License](./LICENSE) のもとで公開されています。
