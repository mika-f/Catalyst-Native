# Carousel Viewer

React Native 用の画像 Carousel / Fullscreen Detail Viewer。
Gesture Handler と Reanimated によるカスタム実装です。

## 使用例

ホストアプリの dependencies にこの workspace パッケージを追加してください。

```json
{
  "@natsuneko-laboratory/carousel-viewer": "workspace:*"
}
```

```tsx
import { ImageGallery } from "@natsuneko-laboratory/carousel-viewer";

<ImageGallery
  images={[
    { id: "landscape", uri: "https://example.com/landscape.jpg", width: 1600, height: 900, alt: "山の風景" },
    { id: "portrait", uri: "https://example.com/portrait.jpg", width: 900, height: 1600, alt: "木漏れ日" },
  ]}
  maxScale={4}
  onIndexChange={(index) => console.log(index)}
/>;
```

既定の Carousel は親幅いっぱいの正方形です。
`style={{ height: 280, aspectRatio: undefined }}` 等でサイズを変更できます。
dot indicator は画像領域の外側・下部に表示し、その高さは `style` の画像サイズに含めません。

Expo / Bare ともにホスト側へ React Native Gesture Handler、Reanimated 4、
React Native Worklets、Safe Area Context をインストールし、
そのバージョンに対応したネイティブ設定・Babel Worklets 設定を行ってください。
Gesture root と Modal 内の SafeAreaProvider はパッケージで用意します。
Bare ではネイティブ依存の追加後に Pods の更新とアプリの再ビルドが必要です。
Uniwind、Expo 固有 API、第三者製 image viewer への依存はありません。
Metro が TypeScript ソースを処理する workspace 向けパッケージです。

## API

`GalleryImage` / `ImageGalleryProps` は仕様書の API を実装しています。

- `initialIndex = 0`: 初回のみ使用。空配列は何も表示せず、範囲外の index は補正します。
- `minScale = 1` / `maxScale = 4`: 1 は viewport に contain したサイズです。初期値とページ変更時は常に 1。設定範囲は `0 < minScale <= 1 <= maxScale`。
- `pagingScaleThreshold = 1.02` / `dismissScaleThreshold = 1.02`。
- `onIndexChange` / `onOpenDetail` / `onCloseDetail`: 意味的な変更だけを JS 側へ通知します。
- `renderImage(image, { mode, index })`: カスタム画像。親の領域いっぱいに contain してください。独自ローダーの場合、loading/error 表示は呼び出し側で担当します。
- `style`: Carousel のサイズ指定。
- `renderOverlay({ index, close })`: Safe Area 内に追加する任意の UI。
- `doubleTapScale = 2.5`: Detail のダブルタップでタップ位置を中心に拡大し、拡大中なら等倍に戻します。1 以下で無効。
- `onLongPress(index)` / `longPressDuration = 500`: Detail 画像の長押し。指が動く・二本目の指が触れると取り消します。
- `reduceMotion`: 指定するとシステムの Reduce Motion 設定より優先します。
- `detailEnabled = true`: false の場合、Carousel のタップで Detail を開きません。
- `renderCarouselOverlay({ index, width, height })`: Carousel の画像領域の上に重ねる UI。gesture の外側に配置するため、overlay 上のタッチは Carousel の操作になりません。
- `renderCarouselIndicator({ count, index, progress, setIndex })`: 既定の dot indicator を置き換えます。
- `renderDetailForeground({ index, close })`: Detail の全画面・Safe Area 外に描画する UI（bottom sheet など）。dismiss 中もフェードしません。
- 単独利用向けに `ImageCarousel` と `ImageDetailViewer` も export しています。いずれも `index` と `onIndexChange` による controlled component です。Detail は表示中だけ mount してください。

画像 ID は一意で安定した値を使用してください。画像一覧変更時の選択は index 基準です。
縦横サイズが不明な画像には React Native の Image.getSize を使用します。
現在画像と前後画像のみを mount します。
隣接ページへの切替では表示済み画像の mount と読み込み状態を維持し、Detail の zoom/pan のみリセットします。
表示範囲から外れた画像は unmount されるため、遠いページへ戻る際のキャッシュは画像ローダーに依存します。

## 操作

Carousel は左右スワイプとタップに対応します。Detail は左右ページ送り、
上下 dismiss、focal point を維持するピンチと二本指移動、拡大中の pan に対応します。
距離と速度でページ送り・dismiss を判断し、境界では非線形の抵抗を加えます。

Carousel のスワイプは、ドラッグ開始から 10pt 動いた時点で水平か垂直かを一度だけ判定します。
水平から約 30 度（`|dy| > |dx| / 1.7`）を超える角度のドラッグは gesture を fail させ、
タッチを外側へ渡します。判定は一度きりなので、水平と確定した後に指を縦へ動かしても
ページ送りを維持します。

fail した後にどの gesture がタッチを取るかは RNGH 通常の競合解決に委ねられます。
外側に横スクロールできるもの（タブページャなど）があると、縦のスクロールビューではなく
そちらが掴むことがあるため、行き先を限定したい場合はホスト側で
`blocksExternalGesture` などの関係を張ってください。

操作の所有権は方向確定後に固定します。ページ送り・pan・dismiss 中に二本目の指を
追加した場合は既存操作を settle し、完了後の move から新しい pinch 基準を作ります。
pinch で一本指になった場合は全指を離すまで別操作に切り替わりません。
ページ送り・ダブルタップ zoom などの spring 中に触れた場合、アニメーションは継続し、指が動く・pinch・ダブルタップした時点でその位置から操作を引き継ぎます。それ以外の settle 中の新しいタッチ列は無視します。

画面サイズ変更時は index を保持して zoom/pan を初期化します。
Reduce Motion を尊重し、閉じるボタン、読み上げラベル、ページ変更の accessibility
actions、Modal 内へのフォーカス移動を提供します。

## 検証

リポジトリルートから実行します。テストは Node 24 を使用します。

```sh
node --test packages/carousel-viewer/tests/*.test.ts packages/carousel-viewer/tests/*.test.mjs
./node_modules/.bin/tsc -p packages/carousel-viewer/tsconfig.json --noEmit
```

計算ロジック、実際の Detail gesture callback に対するタッチ列、ページ切替時の画像の mount 維持を自動検証します。
Worklets Babel plugin を通した closure に Gesture オブジェクトが含まれないことも検証します。
ジェスチャー用テストの native/animation adapter は deterministic な mock です。
実デバイスの認識・フレームレート・spring の見た目を保証するものではありません。
実機での受け入れ確認は [MANUAL_TESTS.md](MANUAL_TESTS.md) を参照してください。
