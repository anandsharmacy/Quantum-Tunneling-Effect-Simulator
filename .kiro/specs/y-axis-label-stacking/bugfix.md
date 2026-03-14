# Bugfix Requirements Document

## Introduction

When the potential barrier height (V0_) is increased to large values (e.g. 10 eV), the Y-axis labels on the left side of the canvas overlap and stack on top of each other, making the chart unreadable. The root cause is a hardcoded Y-axis tick step (`yTS`) in `draw()` that does not scale with `ymax`. When `ymax` grows to ~10+, the fixed step of `0.1` produces ~200 ticks that all render at nearly the same pixel position.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the barrier potential V0_ is set to a large value (e.g. ≥ 1 eV) causing `ymax` to exceed ~0.15 THEN the system uses a hardcoded tick step of `0.1`, producing far too many Y-axis ticks that render on top of each other.

1.2 WHEN `ymax` is approximately 10 or greater THEN the system renders ~200 Y-axis grid lines and labels in the same pixel region, making the Y-axis completely unreadable.

1.3 WHEN `ymax` is between 0.15 and ~1.5 THEN the system uses a tick step of `0.1`, which may still produce more ticks than the canvas height can display without overlap.

### Expected Behavior (Correct)

2.1 WHEN the barrier potential V0_ is set to any value in the range 0.1–10 eV THEN the system SHALL compute an adaptive tick step that targets approximately 6–10 visible ticks on the Y-axis, rounded to a "nice" number (e.g. 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10).

2.2 WHEN `ymax` is large (e.g. ~10) THEN the system SHALL use a tick step large enough (e.g. 2 or 5) so that Y-axis labels never overlap regardless of canvas height.

2.3 WHEN `ymax` is small (e.g. ~0.1 for wavefunction-only display) THEN the system SHALL use a fine tick step (e.g. 0.05) to maintain useful axis resolution.

2.4 WHEN the tick step is recomputed THEN the system SHALL apply the same adaptive step to both the Y-axis grid lines and the Y-axis labels so they remain in sync.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the barrier potential is at its default/low value and `ymax` is small (≤ 0.15) THEN the system SHALL CONTINUE TO render Y-axis ticks at a fine step (0.05) as before.

3.2 WHEN the wavefunction amplitude is the dominant factor in `ymax` THEN the system SHALL CONTINUE TO scale the Y-axis correctly based on `Math.max(maxAmp, maxV)`.

3.3 WHEN the X-axis grid lines and labels are rendered THEN the system SHALL CONTINUE TO use the existing fixed `xTS = 40` step, unaffected by this change.

3.4 WHEN the canvas is resized THEN the system SHALL CONTINUE TO recompute and render the Y-axis correctly with the adaptive tick step.
