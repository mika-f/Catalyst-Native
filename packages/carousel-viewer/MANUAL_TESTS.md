# 実機受け入れ確認（未実施）

iOS / Android の development build で、横長・縦長・正方形の画像を含む
ImageGallery を表示して確認してください。全項目が実機で通るまでは仕様書の
v1 acceptance criteria をすべて確認済みとは扱いません。

- [ ] Carousel の左右 drag、高速 flick、先頭・末尾の抵抗と spring 復帰。
- [ ] スクロール可能なリストに載せた Carousel で、ほぼ水平の drag は画像が切り替わり、
      斜め（水平から 30 度以上）や垂直の drag では画像が動かない。
      水平と確定した後に指を縦へ動かしてもリストはスクロールしない。
- [ ] 外側に横スクロール可能なもの（タブページャなど）がある構成では、30〜50 度程度の
      drag で画像もリストも動かず、その横スクロールだけが動く挙動になっていないか確認する。
- [ ] リストを斜めに drag して指を離しても Detail が開かない。
- [ ] Carousel / Detail の隣接ページを往復しても、読み込み済み画像に spinner やちらつきが再発しない。
- [ ] Carousel の dot indicator が画像の外側・下部に表示され、画像の aspect ratio を変えない。
- [ ] Detail を開いて pinch しても `Cannot copy value of type 'ManualGesture'` が出ない。
- [ ] tap で同じ index を開き、Detail 内のページ送り後に同じ index へ戻る。
- [ ] Detail の先頭・末尾、左右 flick、移動距離不足からの復帰。
- [ ] 上下 dismiss とキャンセル。背景の透明度と画像の追従。
- [ ] 水平方向確定後に縦へ、垂直方向確定後に横へ動かしても ownership が変わらない。
- [ ] 中心以外で pinch。つまんだ画像上の点が指から逃げず、二本指移動も追従する。
- [ ] 最小・最大倍率の overshoot と復帰。zoom-out 後に両軸が有効範囲へ戻る。
- [ ] 拡大中の上下左右 pan、画像端での抵抗。さらに横へ動かしても隣画像へ進まない。
- [ ] pinch 中に一本指へ戻しても pan/paging/dismiss を開始しない。
- [ ] paging / dismiss 中に二本目の指を追加すると、復帰完了後から pinch を開始する。
- [ ] キャンセル、三本目の指、アプリの background/foreground 後に操作が再開できる。
- [ ] ダブルタップでタップ位置を中心に拡大し、再度のダブルタップで等倍に戻る。一回タップやドラッグでは反応しない。
- [ ] 長押しで `onLongPress` が一度だけ呼ばれ、動かした場合・pinch 時は呼ばれない。
- [ ] `renderCarouselOverlay` 上のボタンを押しても Carousel のタップ・スワイプが発火しない。
- [ ] 端末回転、iPad split view、window resize 後も index を保持して zoom をリセット。
- [ ] metadata 不明・低速読み込み・読み込み失敗・カスタム renderImage。
- [ ] VoiceOver / TalkBack で位置と alt を読み上げ、前後移動・閉じる操作が可能。
- [ ] notch / navigation bar と indicator / overlay が重ならない。
- [ ] Reduce Motion 有効時に大きな登場アニメーションを抑える。
- [ ] JS thread に一時的な負荷を加えても、進行中の drag / pinch / spring は UI thread で継続。
