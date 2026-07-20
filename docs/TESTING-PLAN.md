# Catalyst-Native テスト計画

モバイルアプリはストア審査を挟むためリリース機会が限られる。リグレッションを出荷前に機械的に検出できる体制を、費用対効果の高い順に段階的に整備する。

## 現状

- 自動テストは 0 件。テストランナー（jest / vitest）も未導入
- CI はタグ push 時のリリースビルドのみ（`.github/workflows/on-push-tags_*`）。PR 時の typecheck / lint は回っていない
- コード構成: 画面（`app/`）約 40、コンポーネント約 90。純粋ロジックは `lib/` と `models/` に集中している
- `lib/licenses.ts` と `lib/emojis.ts` は `bin/` スクリプトによる生成物のため **テスト対象外**

## 方針

優先度は次の順とする:

1. リグレッションを CI で機械的に止める基盤（typecheck / lint / test）
2. 壊れると致命的なロジック（認証・URL 生成・タイムラインマージ）の unit テスト
3. 主要フローの E2E スモーク（リリース前ゲート）

画面コンポーネントの網羅的なテストは保守コストが利益を上回るため追わない。カバレッジ目標は `lib/` + `models/` で 80% 以上とし、全体のカバレッジ率は KPI にしない。

---

## Phase 0: 基盤整備 【完了】

- **jest-expo + @testing-library/react-native** を導入済み
  - **jest は 29 系に固定すること**。jest-expo 57 は jest ^29 前提で、jest 30 を入れると
    `this._moduleMocker.clearMocksOnScope is not a function` で全テストが落ちる
  - **RNTL v14 から `render` は async API**。`await render(...)` としてから `screen` を使う
  - `transformIgnorePatterns` は jest-expo のデフォルト（pnpm の `.pnpm` レイアウト対応済み）に
    `@natsuneko-laboratory` / `uniwind` / `lucide-react-native` を追加（`jest.config.js`）
  - `@/` パスエイリアスは `moduleNameMapper` で解決
- `pnpm test` / `pnpm typecheck` スクリプトを追加済み
- **PR 用 CI ワークフロー** `.github/workflows/on-pull-request_ci.yml` を新設済み:
  `expo lint` + `tsc --noEmit` + `jest` を PR と develop への push で実行
- サンプルテスト: `lib/merge.test.ts` / `lib/media.test.ts`（Phase 1 の先行分）、
  `components/design-system/text.test.tsx`（RNTL パイプラインのスモーク）

## Phase 1: 純粋ロジックの unit テスト（ROI 最高） 【完了】

外部依存なしで即テストできる関数群。カバレッジ目標 90%。

| 対象 | 理由・観点 | 状態 |
|---|---|---|
| `lib/media.ts` `getCdnUrl` | 分岐が最多。CDN ホスト 3 系統 × variant マッピング × aspect（縦長 / 横長 / 正方形で fit / crop が変わる）× citlali の `?format=auto`。URL 生成ミスは全画面の画像表示に波及する | ✅ `lib/media.test.ts`（100%） |
| `lib/merge.ts` | タイムラインのページネーション重複排除の心臓部。重複 ID、`into: "first" / "last"`、空配列 | ✅ `lib/merge.test.ts`（100%） |
| `components/emoji-verse/unicode.ts` | サロゲートペア・ZWJ・skin tone 等の Unicode 処理はエッジケースの宝庫 | ✅ `unicode.test.ts`（94%） |
| `components/emoji-verse/frequency-manager.ts` | 絵文字の最近使った履歴（重複排除・先頭移動・上限 30 件での切り捨て）。`expo-secure-store` はモック | ✅ `frequency-manager.test.ts`（95%） |
| `components/emoji-verse/emoji-data.ts` | Unicode CLDR データのパース・カテゴリ分類 | 未着手（`useAssets` / `expo-file-system` への依存が強く、Phase 3 のコンポーネントテストと合わせて検討） |
| `lib/reactions.ts` / `lib/share.ts` / `lib/utils.ts` | 小さいのでまとめて | ✅ 全てテスト済み（`share.ts` は twitter-text の重み付き文字数カウントに基づく切り詰めを重点的にカバー） |
| `models/` の各 settings（`notification-settings` / `image-quality-settings` / `sensitive-content-settings` / `streaming-settings` / `browser-settings`） | デフォルト値・シリアライズ往復（保存 → 読込で同値に戻るか）。`AsyncStorage` はモック | ✅ 永続化まわりの関数のみテスト。`notification-settings.ts` の Firebase Messaging 連携部分（`getAuthorizationStatus` 等）は Phase 2 以降で扱う。`browser-settings.ts` の `openUrlWithBrowser` は各ブラウザーのスキーム変換ロジックまで検証 |

テスト用の共通基盤として追加したもの:
- `__mocks__/@react-native-async-storage/async-storage.js` / `__mocks__/expo-secure-store.js`: in-memory の手動モック。`jest.mock(...)` で明示的に opt-in して使う
- `test/helpers/async-storage.ts`: `resetAsyncStorageMock()` — モジュールスコープで共有される in-memory ストアをテスト間でリセットする共通ヘルパー
- 注意: `jest.mock(...)` の呼び出しは import 文より後に書くこと。babel-jest が実行時には import より前にホイストするため動作は問題ないが、先に書くと `import/first` の eslint warning が出る

## Phase 2: 認証まわり（壊れると一番痛い） 【完了】

対象: `models/credential.ts` / `models/credential-store.ts`。カバレッジ 100%（stmts / branch / funcs / lines）。

### `credential-store.ts`（`credential-store.test.ts`）

- `getCredential`: トークン未保存時は `EMPTY_CREDENTIAL`、片方だけ保存されていても復元しない、保存済みトークンで `CatalystTS` を正しいオプションで構築する
- **自動リフレッシュの反映**: `CatalystTS` は 401 を検知すると内部で自動的にトークンをリフレッシュする実装になっており、`getCredential` はレスポンスインターセプター（`onResponse`）経由でその新トークンを SecureStore と `accountAtom`（jotai）へ反映する。この一連の流れをモックした `CatalystTS` のインスタンス経由で検証（アクセストークンが変化しない場合は再永続化しないことも含む）
- `saveCredential` / `clear`: SecureStore への保存・削除

### `credential.ts`（`credential.test.ts`）

**`tryRestore`**
1. 有効トークン → ログイン成功
2. アクセストークン失効 → **refresh 成功パス**（新トークンが SecureStore に保存されること）
3. refresh も失敗 → `logout()` されて未ログイン状態で返る
4. トークンなし → 未ログイン状態で返る
5. me 取得 / refresh 後の me 取得が 200 を返しても `user` が空（不正なレスポンス）→ 未ログインで終わる

**`login`**
1. 正常フロー（code 交換 → トークン保存 → ユーザー取得）
2. **`state` 不一致で拒否されること**（CSRF 防御の要）
3. ブラウザキャンセル（`result.type !== "success"`）
4. `code` 欠落
5. トークン交換後の me 取得が失敗 / user 空 → 未ログインで終わる（例外を握りつぶして返す既存の仕様どおり）

**`logout`**: `CredentialStore.clear` を呼ぶ

失敗時に必ず `EMPTY_CREDENTIAL` に落ちる保証は、「ユーザーがログイン不能になる」不具合の最終防衛線。

テスト基盤として `__mocks__/@natsuneko-laboratory/catalyst-sdk.js`（`CatalystTS` / `PKCE` の手動モック。コンストラクタに渡されたオプションとインスタンスを記録し、レスポンスインターセプターを手動で発火できる）と `test/helpers/secure-store.ts`（`resetSecureStoreMock()`）を追加。`credential.test.ts` では `@/models/credential-store` 自体を丸ごとモックし、認証フローのオーケストレーションのみを対象にすることで `credential-store.ts` の実装詳細から独立させた。

## Phase 3: コンポーネントテスト（RNTL） 【完了(一部)】

ロジックを内包するコンポーネントに絞る。21 件のテストを追加（合計 119 件, 18 suites）。

- **`components/status/text.tsx` `StatusText` — 最優先** ✅ `text.test.tsx`
  - twitter-text のエンティティ抽出 → HTML 文字列組み立て → remark / rehype → RN 要素という多段変換
  - URL / ハッシュタグ / メンション / 日本語混在 / 改行の描画を検証
  - `sb.push(`<a href="${url}">...`)` と生 HTML を文字列連結しているため、`"` や `<script>` を含む投稿本文を RehypeSanitize が確実に無害化することをテスト。**props 注入がないこと**（`onmouseover` 等の不正な属性が RN 要素の props に漏れ出さないこと）を描画ツリー全体を走査して検証するのが実際に効くセキュリティテスト
- `components/timeline/base.tsx` ✅ `base.test.tsx`: 初回ロード、pull-to-refresh の先頭マージ、無限スクロール(`onEndReached`)の末尾マージ、フェッチャーが空配列 / 既知の ID のみを返した場合に `hasMore` が false になり以降のリクエストが止まること（無限ループ防止）、`scrollToTop` ハンドル
- `components/fleet/content.tsx` ✅ `content.test.tsx`: `resolveMediaUri`（`getCdnUrl` 経由で medium variant を解決）/ `resolveStickerImageUrl`（`imageUrl` 優先、無ければ絵文字から CDN 規約 URL を組み立て、どちらも無ければ `undefined`）
- `components/design-system/` 配下（Button / Badge / TextField 等の状態別スナップショット）は未着手。Jest 環境では UniWind の Metro babel 変換が適用されず `className` は文字列のまま素通りするため（実機の色解決を検証できない）、費用対効果が低いと判断し見送り。UniWind パッケージ自体が専用の jest 設定（`jest.config.native.js`）を持っているため、本格的にやるならそちらの仕組みを調査してから着手する

### テスト基盤として追加した主な回避策

いずれも Jest 実行時特有の問題で、本番コードは変更していない。

- **`react-native-reanimated` 4 / `react-native-worklets`**: ネイティブバインディング必須で import 時にクラッシュする。`jest.config.js` に `resolver: "react-native-worklets/jest/resolver.js"`（公式提供のリゾルバ、`.native` 拡張子解決をスキップして JS 実装を使わせる）を設定
- **`transformIgnorePatterns` を許可リスト方式から除外リスト方式に変更**: unified/remark/rehype エコシステムなど ESM-only なパッケージが多く、個別に許可リストへ追加し続けるのは非現実的。babel プラグインとして直接 require される `react-native-reanimated/plugin` と `@react-native/babel-preset` の 2 つだけを除外し、残りは全て変換する方式に統一
- **`@natsuneko-laboratory/react-native-twitter-text`**: エンティティ抽出が TurboModule（ネイティブ実装）。`__mocks__/@natsuneko-laboratory/react-native-twitter-text.js` で、同じアルゴリズムの純 JS 実装である `twitter-text`（既存の依存関係）を使った代替実装を提供
- **`@/components/design-system` バレル / `expo-router`**: どちらも import すると `expo-glass-effect`（iOS ネイティブビュー）等の重いコンポーネントまで芋づる式に読み込まれる。テストファイル内で `jest.mock(...)` により必要な値・コンポーネントだけの軽量なモックに差し替える
- **`@shopify/flash-list` / `expo-image`**: 実際の仮想化リストやネイティブ画像コンポーネントは検証せず、props を記録するだけのモックに差し替えて「渡された callback を直接呼ぶ」ことで状態遷移を駆動する。FlashList 自体の描画・仮想化は Phase 4 の E2E で担保する
- RNTL v14 の `getByText` は関数マッチャーを受け付けず `string | RegExp` のみ。複数テキストノードにまたがる内容を確認する場合は正規表現を使う

## Phase 4: E2E スモーク（Maestro 推奨）

Detox より Maestro の方が Expo との相性・保守コストで有利。**リリース前に必ず回す最小セット**:

1. 起動 → 未ログインで firehose タイムラインが表示される
2. ログイン
   - OAuth が外部ブラウザ経由のため Maestro では直接操作が困難
   - → `app/settings/debug.tsx` に**デバッグビルド限定のトークン注入経路**を用意するのが現実解
3. 投稿詳細を開く → リアクション → 取り消し
4. 検索 → ユーザープロフィール表示
5. 投稿作成（テキストのみ）→ タイムラインに反映
6. Fleet 閲覧、設定画面の開閉、ダークテーマ切替

実行タイミングは「PR ごと」ではなく **preview ビルド作成時 + リリースタグ前**で十分。iOS / Android 両方で回す。

## リリース前チェックリスト（手動）

自動化の対象外だが、リリース前に固定リストとして毎回確認する:

- [ ] プッシュ通知の受信・タップ遷移
- [ ] ディープリンク（`app/authorize.tsx` の OAuth リダイレクト含む）
- [ ] 写真パーミッション拒否時の挙動
- [ ] オフライン起動
- [ ] **旧バージョンからのアップグレード**（SecureStore / AsyncStorage の保存データ互換が保たれるか）

特に最後のストレージ互換は、ストア配布アプリでは事故ると取り返しがつかない。Phase 1 の settings シリアライズテストと合わせて重視する。

## 進め方

- Phase 0 + 1 は 1〜2 日で導入できる規模
- 以降は「バグを踏んだら、まずその再現テストを書いてから直す」運用に乗せる
- カバレッジは `lib/` + `models/` で 80% 以上を目標。画面コンポーネントの網羅は追わない
