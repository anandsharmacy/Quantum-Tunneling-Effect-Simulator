# Y-Axis Label Stacking Bugfix Design

## Overview

The `draw()` function in `js/utils/simulation.js` uses a hardcoded Y-axis tick step
`const yTS = ymax > 0.15 ? 0.1 : 0.05`. When `V0_` is large (e.g. 10 eV), `ymax`
grows to ~10+, causing ~200 ticks to render at nearly identical pixel positions and
making the Y-axis completely unreadable. The fix replaces the hardcoded step with an
adaptive "nice number" algorithm that targets 6–10 visible ticks regardless of `ymax`.

## Glossary

- **Bug_Condition (C)**: `ymax > 0.15` — the condition under which the old hardcoded
  `yTS = 0.1` produces too many ticks and causes label stacking.
- **Property (P)**: The desired behavior — the computed `yTS` results in 6–10 visible
  ticks on the Y-axis, chosen from a set of "nice" numbers.
- **Preservation**: The existing behavior for `ymax <= 0.15` (fine step of 0.05) and
  all X-axis rendering must remain unchanged.
- **yTS**: Y-axis tick step — the value increment between consecutive Y-axis grid lines
  and labels.
- **ymax**: The upper bound of the Y-axis, computed as
  `Math.ceil(Math.max(maxAmp, maxV) * 10) / 10 + 0.02`, clamped to at least 0.1.
- **niceStep(raw)**: The adaptive algorithm that rounds a raw step up to the nearest
  value in `[0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]`.
- **tickCount**: The number of Y-axis ticks rendered, approximately `(2 * ymax) / yTS`.

## Bug Details

### Bug Condition

The bug manifests when `ymax` exceeds 0.15 (i.e. when `V0_` is raised above ~1 eV).
The `draw()` function uses a fixed `yTS = 0.1` regardless of how large `ymax` grows,
producing a tick count of `(2 * ymax) / 0.1` — up to ~200 ticks for `ymax ≈ 10`.

**Formal Specification:**
```
FUNCTION isBugCondition(ymax)
  INPUT: ymax — positive number, the Y-axis upper bound
  OUTPUT: boolean

  RETURN ymax > 0.15
         AND yTS_hardcoded = 0.1
         AND tickCount(ymax, yTS_hardcoded) > 20
END FUNCTION

FUNCTION tickCount(ymax, yTS)
  RETURN Math.ceil((2 * ymax) / yTS)
END FUNCTION
```

### Examples

- `ymax = 0.12` → old code: `yTS = 0.05`, tickCount ≈ 5 — fine, no bug
- `ymax = 0.20` → old code: `yTS = 0.1`, tickCount = 4 — borderline acceptable but
  the adaptive algorithm would also produce `yTS = 0.05` or `0.1` here
- `ymax = 1.0` → old code: `yTS = 0.1`, tickCount = 20 — labels start to crowd
- `ymax = 5.0` → old code: `yTS = 0.1`, tickCount = 100 — severe stacking
- `ymax = 10.0` → old code: `yTS = 0.1`, tickCount = 200 — axis completely unreadable
- `ymax = 10.0` → fixed code: `yTS = 2`, tickCount = 10 — clean, readable

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `ymax <= 0.15`, the tick step SHALL remain `0.05` (same as before).
- The X-axis tick step `xTS = 40` SHALL remain fixed and unaffected by this change.
- The `ymax` computation (`Math.ceil(Math.max(maxAmp, maxV) * 10) / 10 + 0.02`) SHALL
  remain unchanged.
- Canvas resize SHALL continue to trigger a full redraw with the correct adaptive step.

**Scope:**
All inputs where `ymax <= 0.15` are completely unaffected. The only change is the
single line that computes `yTS` when `ymax > 0.15`.

## Hypothesized Root Cause

The root cause is straightforward and confirmed by code inspection:

1. **Hardcoded tick step ignores ymax magnitude**: `const yTS = ymax > 0.15 ? 0.1 : 0.05`
   only distinguishes two cases. It does not scale with `ymax`, so as `ymax` grows from
   0.15 to 10, the tick count grows from ~3 to ~200.

2. **No minimum pixel spacing enforcement**: There is no check that the pixel distance
   between consecutive ticks (`PH / tickCount`) is large enough to prevent text overlap
   (~12px minimum for 11px font).

3. **No "nice number" rounding**: Even if a raw adaptive step were computed as
   `(2 * ymax) / TARGET_TICKS`, it would produce arbitrary decimals (e.g. 0.333) that
   look ugly as axis labels. A nice-number lookup is needed.

## Correctness Properties

Property 1: Bug Condition - Adaptive Tick Step Prevents Label Stacking

_For any_ `ymax` where the bug condition holds (`ymax > 0.15`), the fixed `draw()`
function SHALL compute a `yTS` such that the resulting tick count
`Math.ceil((2 * ymax) / yTS)` is between 4 and 12 (inclusive), and `yTS` is one of
the nice values `[0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]`.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Small ymax Behavior Unchanged

_For any_ `ymax` where the bug condition does NOT hold (`ymax <= 0.15`), the fixed
`draw()` function SHALL compute `yTS = 0.05`, identical to the original function,
preserving the fine-grained tick resolution for small Y-axis ranges.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

**File**: `js/utils/simulation.js`

**Function**: `draw()`

**Specific Changes**:

1. **Replace the hardcoded yTS line** with an adaptive nice-number algorithm:

```js
// Before (buggy):
const yTS = ymax > 0.15 ? 0.1 : 0.05;

// After (fixed):
const NICE_STEPS = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
const TARGET_TICKS = 8;
const rawStep = (2 * ymax) / TARGET_TICKS;
const yTS = NICE_STEPS.find(s => s >= rawStep) ?? NICE_STEPS[NICE_STEPS.length - 1];
```

2. **No other changes required** — both the grid-line loop and the label loop already
   reference the same `yTS` variable, so they will automatically stay in sync (satisfying
   requirement 2.4).

### Algorithm Explanation

- `rawStep = (2 * ymax) / 8` computes the ideal step for exactly 8 ticks.
- `NICE_STEPS.find(s => s >= rawStep)` rounds up to the nearest nice number, ensuring
  tick labels are clean decimals.
- For `ymax = 0.12`: `rawStep = 0.03` → `yTS = 0.05` ✓ (preserves old behavior)
- For `ymax = 0.20`: `rawStep = 0.05` → `yTS = 0.05` ✓
- For `ymax = 1.0`: `rawStep = 0.25` → `yTS = 0.5` ✓ (5 ticks, readable)
- For `ymax = 5.0`: `rawStep = 1.25` → `yTS = 2` ✓ (5 ticks, readable)
- For `ymax = 10.0`: `rawStep = 2.5` → `yTS = 5` ✓ (4 ticks, readable)

## Testing Strategy

### Validation Approach

Two-phase approach: first surface counterexamples on unfixed code to confirm the root
cause, then verify the fix satisfies Property 1 and Property 2.

### Exploratory Bug Condition Checking

**Goal**: Demonstrate the bug on unfixed code. Confirm that `yTS = 0.1` when
`ymax > 0.15` produces an unacceptable tick count.

**Test Plan**: Extract the `yTS` computation into a pure helper function
`computeYTickStep(ymax)` so it can be unit-tested in isolation. Run tests against the
UNFIXED implementation to observe failures.

**Test Cases**:
1. **Large ymax (10.0)**: Assert `tickCount(10.0, computeYTickStep(10.0)) <= 12`
   — will FAIL on unfixed code (returns 200)
2. **Medium ymax (1.0)**: Assert `tickCount(1.0, computeYTickStep(1.0)) <= 12`
   — will FAIL on unfixed code (returns 20)
3. **Boundary ymax (0.20)**: Assert `tickCount(0.20, computeYTickStep(0.20)) <= 12`
   — will FAIL on unfixed code (returns 4 — borderline, but yTS=0.1 is not a nice fit)
4. **Small ymax (0.12)**: Assert `computeYTickStep(0.12) === 0.05`
   — will PASS on unfixed code (preserved behavior)

**Expected Counterexamples**:
- `computeYTickStep(10.0)` returns `0.1`, producing `tickCount = 200`
- `computeYTickStep(1.0)` returns `0.1`, producing `tickCount = 20`

### Fix Checking

**Goal**: Verify Property 1 — for all `ymax > 0.15`, the fixed function produces a
tick count in [4, 12] using a nice step value.

**Pseudocode:**
```
FOR ALL ymax WHERE isBugCondition(ymax) DO
  yTS := computeYTickStep_fixed(ymax)
  ASSERT yTS IN [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]
  ASSERT tickCount(ymax, yTS) >= 4
  ASSERT tickCount(ymax, yTS) <= 12
END FOR
```

### Preservation Checking

**Goal**: Verify Property 2 — for all `ymax <= 0.15`, the fixed function returns
`yTS = 0.05`, identical to the original.

**Pseudocode:**
```
FOR ALL ymax WHERE NOT isBugCondition(ymax) DO
  ASSERT computeYTickStep_original(ymax) = computeYTickStep_fixed(ymax)
END FOR
```

**Testing Approach**: Property-based testing is recommended for fix checking because
the valid `ymax` range [0.1, ~10.5] is continuous and manual spot-checks could miss
edge cases near nice-number boundaries (e.g. `ymax = 0.401` where `rawStep = 0.1`
exactly).

**Test Cases**:
1. **Preservation of fine step**: For `ymax` in (0, 0.15], verify `yTS = 0.05`
2. **X-axis unaffected**: Verify `xTS = 40` is not modified by the yTS change
3. **Both loops use same yTS**: Verify grid-line loop and label loop reference the
   same computed `yTS` (code inspection / single variable test)

### Unit Tests

- Test `computeYTickStep(ymax)` for representative values:
  `0.05, 0.10, 0.12, 0.15, 0.20, 0.5, 1.0, 2.0, 5.0, 10.0, 10.5`
- Test that `tickCount` is in [4, 12] for all `ymax` in the valid range
- Test that `yTS` is always a member of the nice-steps array
- Test the boundary `ymax = 0.15` returns `yTS = 0.05` (preservation)
- Test the boundary `ymax = 0.16` returns a nice step > 0.05 (fix kicks in)

### Property-Based Tests

- Generate random `ymax` in (0.15, 10.5]: verify `yTS ∈ NICE_STEPS` and
  `tickCount ∈ [4, 12]` (Property 1)
- Generate random `ymax` in (0, 0.15]: verify `yTS = 0.05` matches original
  (Property 2)
- Generate random `ymax` across full range: verify `yTS` is always a nice number
  (no arbitrary decimals)

### Integration Tests

- Set `V0_ = 10` in the simulator, call `draw()`, and assert no DOM/canvas errors
  and that the rendered tick positions are visually spaced (pixel distance >= 10px)
- Set `V0_ = 0.1` (default), call `draw()`, and assert tick step is still 0.05
- Resize the canvas and verify `draw()` recomputes `yTS` correctly for current `ymax`
