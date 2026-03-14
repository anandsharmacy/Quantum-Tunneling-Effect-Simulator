# Y-Axis Label Stacking Bugfix Tasks

## Tasks

- [x] 1. Extract yTS computation into a testable pure function
  - [x] 1.1 Add a module-level `computeYTickStep(ymax)` function in `js/utils/simulation.js` that encapsulates the nice-number algorithm
  - [x] 1.2 The function must return `0.05` for `ymax <= 0.15` (preservation) and a nice step from `[0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]` for larger values
  - [x] 1.3 Export the function so it can be imported in tests

- [x] 2. Write exploratory tests against unfixed code (bug condition checking)
  - [x] 2.1 [PBT] Write a property test asserting `tickCount(ymax, computeYTickStep(ymax)) <= 12` for all `ymax > 0.15` — expected to FAIL on unfixed code
  - [x] 2.2 Write unit tests for specific values: `ymax = 1.0`, `5.0`, `10.0` asserting tick count <= 12 — expected to FAIL on unfixed code
  - [x] 2.3 Run the exploratory tests on unfixed code and record the counterexamples to confirm root cause

- [x] 3. Implement the fix in `draw()`
  - [x] 3.1 Replace `const yTS = ymax > 0.15 ? 0.1 : 0.05` in `draw()` with a call to `computeYTickStep(ymax)`
  - [x] 3.2 Verify both the grid-line loop and the label loop reference the same `yTS` variable (no duplication)

- [x] 4. Write fix-checking tests (Property 1)
  - [x] 4.1 [PBT] Write a property test asserting that for all `ymax` in (0.15, 10.5], `computeYTickStep(ymax)` returns a value in `NICE_STEPS` and `tickCount` is in [4, 12]
  - [x] 4.2 Write unit tests for boundary and representative values: `0.16, 0.20, 0.5, 1.0, 2.0, 5.0, 10.0, 10.5`
  - [x] 4.3 Run fix-checking tests and confirm they all pass

- [x] 5. Write preservation-checking tests (Property 2)
  - [x] 5.1 [PBT] Write a property test asserting that for all `ymax` in (0, 0.15], `computeYTickStep(ymax) === 0.05`
  - [x] 5.2 Write unit tests for `ymax = 0.05, 0.10, 0.12, 0.15` asserting `yTS = 0.05`
  - [x] 5.3 Write a unit test asserting `xTS = 40` is not affected (X-axis unchanged)
  - [x] 5.4 Run preservation tests and confirm they all pass

- [x] 6. Integration verification
  - [x] 6.1 Manually test the simulator with `V0_ = 10` and confirm Y-axis labels are readable and non-overlapping
  - [x] 6.2 Manually test with `V0_ = 0.1` (default) and confirm Y-axis behavior is unchanged
  - [x] 6.3 Resize the browser window and confirm the Y-axis redraws correctly with the adaptive step
