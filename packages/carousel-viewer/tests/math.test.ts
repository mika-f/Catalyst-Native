import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clamp,
  decidePanAxis,
  getContainSize,
  getPanBounds,
  getPagingTarget,
  getZoomTranslationForFocalPoint,
  lockDirection,
  rubberBand,
  shouldDismiss,
} from "../src/math.ts";

test("contain uses viewport dimensions, not native pixels", () => {
  assert.deepEqual(getContainSize(400, 800, 1600, 800), { width: 400, height: 200 });
  assert.ok(Math.abs(getContainSize(400, 800, 800, 2400).width - 800 / 3) < 1e-10);
});
test("paging distance and flicks work in both directions and stay in range", () => {
  assert.equal(getPagingTarget(1, 3, -81, 0, 400), 2);
  assert.equal(getPagingTarget(1, 3, 81, 0, 400), 0);
  assert.equal(getPagingTarget(1, 3, -10, -501, 400), 2);
  assert.equal(getPagingTarget(1, 3, 10, 501, 400), 0);
  assert.equal(getPagingTarget(1, 3, 80, 500, 400), 1);
  assert.equal(getPagingTarget(0, 3, 200, 900, 400), 0);
  assert.equal(getPagingTarget(2, 3, -200, -900, 400), 2);
  assert.equal(getPagingTarget(0, 0, 200, 900, 400), 0);
});
test("rubber band is continuous, monotonic, bounded, and softer with distance", () => {
  assert.equal(rubberBand(40, -100, 100, 400), 40);
  assert.equal(rubberBand(100, -100, 100, 400), 100);
  let previous = 100;
  for (let n = 1; n < 10000; n += 20) {
    const next = rubberBand(100 + n, -100, 100, 400);
    assert.ok(next > previous && next < 500 && next < 100 + n);
    assert.equal(rubberBand(-100 - n, -100, 100, 400), -next);
    previous = next;
  }
  assert.ok(rubberBand(0, 1, 4, 0.15, 0.2) > 0.85);
});
test("pan bounds shrink with zoom and center the smaller axis", () => {
  assert.deepEqual(getPanBounds(400, 800, 400, 200, 3), { x: 400, y: 0 });
  assert.deepEqual(getPanBounds(400, 800, 400, 200, 1), { x: 0, y: 0 });
  assert.equal(clamp(400, 0, 0), 0);
});
test("pinch retains the same image point even while both fingers move", () => {
  const startFocal = 80,
    startTranslation = 20,
    startScale = 2;
  const imagePoint = (startFocal - startTranslation) / startScale;
  for (const scale of [0.9, 1, 3, 4.1]) {
    const focal = 130;
    const translation = getZoomTranslationForFocalPoint(startFocal, focal, startTranslation, startScale, scale);
    assert.equal(imagePoint * scale + translation, focal);
  }
});
test("direction detection waits for distance and dominance", () => {
  assert.equal(lockDirection(7, 0), "undecided");
  assert.equal(lockDirection(40, 40), "undecided");
  assert.equal(lockDirection(-20, 10), "paging");
  assert.equal(lockDirection(10, -20), "dismissing");
});
test("dismiss recognizes both directions, short flicks, and cancellation", () => {
  assert.ok(shouldDismiss(121, 0, 800));
  assert.ok(shouldDismiss(-121, 0, 800));
  assert.ok(shouldDismiss(1, 801, 800));
  assert.ok(shouldDismiss(-1, -801, 800));
  assert.equal(shouldDismiss(120, 800, 800), false);
});

test("pan axis stays undecided until either component clears the threshold", () => {
  assert.equal(decidePanAxis(0, 0), "undecided");
  assert.equal(decidePanAxis(10, 10), "undecided");
  assert.equal(decidePanAxis(-10, -10), "undecided");
  assert.equal(decidePanAxis(11, 0), "horizontal");
  assert.equal(decidePanAxis(0, 11), "vertical");
});
test("pan axis commits by angle and ignores direction signs", () => {
  // ~30 degrees off horizontal is the cutoff: tan(30) = 0.577 < 1 / 1.7 = 0.588.
  assert.equal(decidePanAxis(100, 57), "horizontal");
  assert.equal(decidePanAxis(100, 60), "vertical");
  // A 45 degree drag scrolls the timeline; the old per-axis boxes made it a swipe up to ~56 degrees.
  assert.equal(decidePanAxis(100, 100), "vertical");
  for (const [x, y] of [
    [100, 20],
    [100, 80],
  ] as const)
    for (const sx of [1, -1])
      for (const sy of [1, -1]) assert.equal(decidePanAxis(sx * x, sy * y), decidePanAxis(x, y));
});
