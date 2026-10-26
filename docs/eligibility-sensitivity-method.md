# Synthetic data-eligibility sensitivity laboratory

PlantLog's public **Demo insights** tab now includes an interactive, repeatable
experiment showing how an internally inconsistent record changes the gap between
**raw descriptive workload** and **quality-eligible workload**. Everything uses
the checked-in, fictional `frontend/src/demo/fixture.json`, with a fixed
observation date. This is a data quality and arithmetic demonstration, **not**
mechanical reliability science, experimental causal evidence, machine-learning
forecasting, a certified CMMS, or a production data pipeline.

## Scientific question and design

> How do explicit data-integrity exclusions change the counts displayed by a
> descriptive maintenance-event dashboard?

- Unit of observation: **one fictional event row** (not one machine or failure).
- Baseline: eight synthetic equipment records, twelve identified event rows,
  all twelve eligible on the pinned snapshot.
- Treatment: one **existing** row is altered per scenario; each starts from an
  independent copy of the same baseline, so record counts remain constant.
- Raw outcome: the existing `buildDemoInsights` totals of unresolved
  incident/maintenance records, including explicitly malformed hypothetical data.
- Eligible outcome: the identical calculation over the row indices passing
  all eight `assessDemoDataQuality` quality gates.
- Both numerators use a defined denominator. Percentages are intentionally
  omitted because these are small fictional bookkeeping examples.

| Case | Intervention | Row-level eligibility consequence |
|---|---|---|
| Baseline | No modification | 12 / 12 records retained |
| Broken equipment link | First incident references nonexistent equipment | 11 / 12 retained; raw backlog remains visible |
| Invalid UTC date | First incident has a fictional impossible February 30 date | 11 / 12 retained |
| Duplicate event ID | Second open case inherits the first case's identifier | 10 / 12 retained; **both** ambiguous rows excluded |
| Overlapping defects | First case gets an invalid equipment link, timestamp and lifecycle state | 11 / 12 retained; three findings, **one** excluded row |

These are controlled **software test fixtures**, not representative samples of
real plants. In particular, do not describe `raw minus eligible` as an
estimated effect of bad data, an equipment reliability coefficient, or a
confidence interval.

## Reproducibility and audit contract

The implementation lives in
[`sensitivity.ts`](../frontend/src/demo/sensitivity.ts), the interactive
display in
[`EligibilitySensitivityLab.tsx`](../frontend/src/components/EligibilitySensitivityLab.tsx),
and the eight quality checks in
[`quality.ts`](../frontend/src/demo/quality.ts).

The quality assessor exposes `eligibleRecordIndices`. Each row is admitted
only if its log identity is present and unique, its equipment reference exists
and unambiguously identifies an asset, its type/status are in the supported
vocabularies, and its timestamp is an actual canonical UTC instant not later
than the snapshot date. Overlapping errors are aggregated as *diagnostic
findings* but eligibility is based on a **set of excluded row indices**, not
the sum of findings. This prevents misleading denominators.

All calculation functions are pure: no clocks, random values, network calls,
browser storage, data writes, or changes to the fixture. The in-memory
incident in Scenario lab can temporarily extend the live demo fixture, after
which the experiments independently rebase on that temporary, valid snapshot.
Reset/reload returns to the original baseline.

Run the checks:

```bash
cd frontend
npm ci
npm run test:demo
npm run lint
npm run test:perf
```

The scientific sensitivity test additionally verifies the baseline invariant,
specific invalidity classes, both sides of a duplicate identity, overlapping
issues, rejection of malformed baselines, and immutability/repeatability. The
Playwright Chromium browser smoke tests the interactive case selectors, the
mobile view and the absence of API calls.

## Machine-readable scientific audit artifact

The frontend test suite generates `frontend/test-artifacts/scientific-evidence.json`
locally from the checked-in synthetic fixture. The script
[`demo-scientific-evidence.cjs`](../frontend/scripts/demo-scientific-evidence.cjs)
records the SHA-256 of the exact fixture bytes, eight quality-gate counters,
count reconciliations, five additive hypothetical cases, five integrity
perturbations, and explicit validity limits. It has **no real-time timestamp,
network input or random seed**, so consecutive executions produce
byte-identical evidence on the same sources.

The evidence format is now **schema version 2**, retaining the prior
quality and perturbation sections while adding `lifecycleTraceability`.
Its nine counters classify recorded status-event consistency independently
of the eight log-eligibility gates. See the
[lifecycle traceability protocol](lifecycle-traceability.md) for
the 3 / 9 / 0 documented / missing / invalid reference split.

The ordinary `npm run test:demo` run asserts the baseline arithmetic and
artifact reproducibility; GitHub Actions publishes the report as the
`plantlog-synthetic-science-evidence` build artifact. The report is not a
ground-truth reliability dataset, and the CI artifact is an analysis output,
not a permanent user record. The controlled comparison events now receive
unique, collision-safe identifiers so a nominally valid hypothetical event
does not accidentally fail the same integrity rules applied to the fixture.
The deliberately unlinked case remains counted in **raw** activity while
being omitted from **quality-eligible** activity.

## Limitations and interpretation

This laboratory is intentionally **not** designed to estimate maintenance
priorities, MTTR/MTBF, downtime, failure risk, safety integrity levels, or
actual asset performance. The existing analytics are count-based, not
exposure-time-normalized. There is no independence/representativeness claim
for the small synthetic case universe. Claims of external validity require
separate, legally shareable historical observations, domain expert review,
and a different evaluation design.

## Visual evidence

The [full-page Chromium screenshots](screenshots-manifest.json) include the
interactive sensitivity section at its **Baseline** selection. The capture
routine also exercises the **Overlapping defects** selection before resetting
the page to the baseline for a deterministic, reviewable screenshot. The
manifest records its source commit, date and viewport rather than asserting
that this UI was verified against live industrial data.
