# Catalyst store screenshots

App Store / Google Play のストア画像を、Tailwind CSS で組んだ Web ページから生成します。

## 編集

通常は [`content.ts`](./content.ts) だけを編集します。

- `headline`: 大見出し（短い 2 行）
- `note`: 補足文
- `screenshot`: 実機スクリーンショットの相対パス（`formats` のキーごとに用意します。iPad 用は iPad 実機のスクリーンショットを指定してください）
- `accent` / `accentSoft`: 画面ごとの識別色
- `formats`: 出力サイズの追加・変更

ブラウザで編集・確認する場合:

```bash
pnpm store-shots:dev
```

表示された `http://127.0.0.1:4173` を開きます。React のプレビュー画面上で見出しと補足文を直接編集できるため、改行や文字量を試せます。確定した文言は `content.ts` に反映してください。

本番ビルドを確認する場合は `pnpm store-shots:build` のあとに `pnpm store-shots:preview` を実行します。

型チェックは `pnpm store-shots:typecheck` で実行できます。

## PNG を書き出す

```bash
# 1284 x 2778 の App Store 画像
pnpm store-shots:export

# App Store（iPhone / iPad）と 1080 x 1920 の Google Play 画像をまとめて生成
pnpm store-shots:export app-store app-store-ipad google-play
```

特定の画像だけを再生成する場合:

```bash
STORE_SHOTS_SLIDES=timeline,contest pnpm store-shots:export app-store
```

Vite が React アプリをビルドしたあと、PNG を `output/<format>/` に生成します。Google Chrome が標準の場所にない場合は `CHROME_PATH` に実行ファイルを指定してください。

## ストア仕様メモ

- `app-store`: iPhone 6.5-inch 用の 1284 x 2778。PNG は透過なしで生成します。
- `app-store-ipad`: iPad Pro (13-inch) 用の 2048 x 2732。iPad 対応アプリは App Store Connect への提出時にこのサイズの画像が必須です。
- `google-play`: phone screenshot 向けの 1080 x 1920（9:16）。Google Play の 320–3840 px、長辺が短辺の 2 倍以下という条件内です。

ストア要件は変更されることがあるため、提出時には Apple / Google の最新ドキュメントも確認してください。
