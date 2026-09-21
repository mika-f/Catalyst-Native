export function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(max, value));
}

export function rubberBand(value: number, min: number, max: number, dimension: number, coefficient = 0.25) {
  "worklet";
  const edge = clamp(value, min, max),
    excess = value - edge;
  return edge + Math.sign(excess) * dimension * (1 - 1 / (1 + (Math.abs(excess) * coefficient) / dimension));
}

export function getContainSize(width: number, height: number, imageWidth: number, imageHeight: number) {
  "worklet";
  const ratio = Math.min(width / imageWidth, height / imageHeight);
  return { width: imageWidth * ratio, height: imageHeight * ratio };
}

export function getPanBounds(width: number, height: number, baseWidth: number, baseHeight: number, scale: number) {
  "worklet";
  return { x: Math.max(0, (baseWidth * scale - width) / 2), y: Math.max(0, (baseHeight * scale - height) / 2) };
}

export function getPagingTarget(
  index: number,
  count: number,
  translation: number,
  velocity: number,
  width: number,
  distanceRatio = 0.2,
) {
  "worklet";
  const direction = Math.abs(velocity) > 500 ? velocity : translation;
  return clamp(
    index + (Math.abs(translation) > width * distanceRatio || Math.abs(velocity) > 500 ? -Math.sign(direction) : 0),
    0,
    Math.max(0, count - 1),
  );
}

export function shouldDismiss(translation: number, velocity: number, height: number) {
  "worklet";
  return Math.abs(translation) > height * 0.15 || Math.abs(velocity) > 800;
}

export function getZoomTranslationForFocalPoint(
  startFocal: number,
  focal: number,
  translation: number,
  startScale: number,
  scale: number,
) {
  "worklet";
  return focal - ((startFocal - translation) * scale) / startScale;
}

export function lockDirection(x: number, y: number): "undecided" | "paging" | "dismissing" {
  "worklet";
  if (Math.max(Math.abs(x), Math.abs(y)) < 8) return "undecided";
  if (Math.abs(x) > Math.abs(y) * 1.2) return "paging";
  if (Math.abs(y) > Math.abs(x) * 1.2) return "dismissing";
  return "undecided";
}

// Distance either axis must travel before the drag commits to an axis.
export const DIRECTION_THRESHOLD = 10;
// 1.7 ≒ tan(60°): drags within ~30° of horizontal stay swipes, steeper ones go to the scroll view.
export const HORIZONTAL_RATIO = 1.7;

/**
 * Decides once, from the first few pixels of a drag, whether it belongs to the carousel or to the
 * scroll view behind it. Mirrors a UIPanGestureRecognizer that sets `state = .failed` in
 * `touchesMoved` when the vertical component wins, which hands the touch back to the scroll view.
 */
export function decidePanAxis(
  dx: number,
  dy: number,
  threshold = DIRECTION_THRESHOLD,
  ratio = HORIZONTAL_RATIO,
): "undecided" | "horizontal" | "vertical" {
  "worklet";
  const x = Math.abs(dx),
    y = Math.abs(dy);
  if (x <= threshold && y <= threshold) return "undecided";
  return y > x / ratio ? "vertical" : "horizontal";
}
