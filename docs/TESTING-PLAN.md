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

## Phase 1: 純粋ロジックの unit テスト（ROI 最高）

外部依存なしで即テストできる関数群。カバレッジ目標 90%。

| 対象 | 理由・観点 |
|---|---|
| `lib/media.ts` `getCdnUrl` | 分岐が最多。CDN ホスト 3 系統 × variant マッピング × aspect（縦長 / 横長 / 正方形で fit / crop が変わる）× citlali の `?format=auto`。URL 生成ミスは全画面の画像表示に波及する |
| `lib/merge.ts` | タイムラインのページネーション重複排除の心臓部。重複 ID、`into: "first" / "last"`、空配列 |
| `components/emoji-verse/unicode.ts` / `frequency-manager.ts` / `emoji-data.ts` | サロゲートペア・skin tone 等の Unicode 処理はエッジケースの宝庫 |
| `lib/reactions.ts` / `lib/share.ts` / `lib/utils.ts` | 小さいのでまとめて |
| `models/` の各 settings（`notification-settings` / `image-quality-settings` / `sensitive-content-settings` など） | デフォルト値・シリアライズ往復（保存 → 読込で同値に戻るか）。AsyncStorage はモック |

## Phase 2: 認証まわり（壊れると一番痛い）

対象: `models/credential.ts` / `models/credential-store.ts`。
`expo-secure-store`・SDK client・`expo-web-browser` をモックして検証する。

### `tryRestore`

1. 有効トークン → ログイン成功
2. アクセストークン失効 → **refresh 成功パス**（新トークンが SecureStore に保存されること）
3. refresh も失敗 → `logout()` されて未ログイン状態で返る
4. トークンなし → 未ログイン状態で返る

### `login`

1. 正常フロー（code 交換 → トークン保存 → ユーザー取得）
2. **`state` 不一致で拒否されること**（CSRF 防御の要）
3. ブラウザキャンセル（`result.type !== "success"`）
4. `code` 欠落

失敗時に必ず `EMPTY_CREDENTIAL` に落ちる保証は、「ユーザーがログイン不能になる」不具合の最終防衛線。

## Phase 3: コンポーネントテスト（RNTL）

ロジックを内包するコンポーネントに絞る。

- **`components/status/text.tsx` `StatusText` — 最優先**
  - twitter-text のエンティティ抽出 → HTML 文字列組み立て → remark / rehype → RN 要素という多段変換
  - URL / ハッシュタグ / メンション / 日本語混在 / 絵文字 / 改行の描画を検証
  - `sb.push(`<a href="${url}">...`)` と生 HTML を文字列連結しているため、**`"` や `<script>` を含む投稿本文を RehypeSanitize が確実に無害化すること**のテストは必須（セキュリティ観点）
- `components/timeline/base.tsx`: ページネーション・pull-to-refresh 時の状態遷移（SDK モック）
- `components/design-system/` 配下: Button / Badge / TextField 等の状態別スナップショット（light / dark 両テーマ）
  - UniWind のテーマ関連バグ対策ルール（`.claude/rules/color-theme.md`）が存在する程度にはテーマ切替は壊れやすく、退行検知の価値が高い
- Fleet 表示のレイアウト数学は [fleet-renderer](https://github.com/mika-f/fleet-renderer) 側でテストするのが筋。アプリ側は `components/fleet/content.tsx` の `resolveMediaUri` / `resolveStickerImageUrl` の注入ロジックのみテストする

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
