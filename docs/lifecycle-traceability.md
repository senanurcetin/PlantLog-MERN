# PlantLog — synthetic lifecycle traceability protocol

**Scope:** fixed, fictional PlantLog portfolio records only. This is an
independent consistency check, not an inspection of industrial maintenance
evidence, historian events, PLC telemetry or a certified audit trail.

## Question

When the demonstration displays a recorded status history, is it internally
consistent with the record's date, current state and the declared maintenance
lifecycle? **A log with no status history cannot answer that question.**

This is deliberately a different axis from the existing eight data-eligibility
checks. An otherwise well-formed equipment log is still counted in descriptive
workload metrics when its timeline is absent. Neither counts nor missing
histories are transformed into invented repair durations.

## Classification and expected baseline

Each fictional entry is classified once:

- **Internally consistent:** a nonempty history starts at `open` with a
  `null` predecessor at the record's exact UTC timestamp; subsequent
  transitions follow the supported state graph; timestamps never decrease and
  never exceed the fixed snapshot; actors are nonblank; final event matches
  the displayed status.
- **Unrecorded:** the `statusHistory` field is absent, null or empty.
  This is *unknown traceability*, not evidence that a technician made no
  transitions and not a failed timeline.
- **Invalid:** a supplied history fails one or more checks (including
  non-array history, invalid ISO timestamps, contradictory chain, reversed
  time, blank actor or final-state mismatch).

Allowed transitions: `open → acknowledged`, `open → resolved`,
`acknowledged → in_progress`, `acknowledged → resolved`, and
`in_progress → resolved`. `resolved` is terminal. Equal timestamps are
allowed for subsequent transitions, but moving backwards is not.

The unchanged 18 October 2026 synthetic fixture has **12 records**, of
which **3 have internally consistent timelines**, **9 have no stored timeline**,
**0 have an invalid stored timeline**, and **7 transition events** are shown.
All 12 may still be eligible under the *separate* basic quality rules.
The browser-only incident scenario adds a temporary, correctly chained case
without persisting it.

## Nine diagnostic codes

`MISSING_HISTORY`, `INVALID_HISTORY_SHAPE`, `INVALID_OPEN_EVENT`,
`INVALID_TRANSITION`, `INVALID_EVENT_TIMESTAMP`,
`NON_MONOTONIC_TIME`, `AFTER_SNAPSHOT`, `MISSING_ACTOR` and
`FINAL_STATE_MISMATCH`.

Counters are **per affected record** and may overlap. Never sum diagnostic
counters to estimate unique faulty records; use `invalidHistory`.
The three category counts always reconcile to `assessedRecords`.

## Test and evidence protocol

- Pure verifier: [traceability.ts](../frontend/src/demo/traceability.ts).
- Regression and adversarial synthetic mutations:
  [demo-traceability.test.cjs](../frontend/tests/demo-traceability.test.cjs).
- `npm run test:demo` runs those tests alongside existing scientific checks.
- The deterministic `scientific-evidence.json` artifact uses
  `schemaVersion: 4` and adds `lifecycleTraceability`: category totals,
  observed event count and all nine issue counters. It retains the fixture
  SHA-256, workload cohort and existing comparative experiments.
- CI checks that the generated artifact is byte-identical between runs.
  GitHub Actions archives the sanitized JSON; source fixture contents,
  hypothetical personnel names and credentials are not uploaded as evidence.

## Deterministic lifecycle model and fault-injection evidence

A bounded reference-model check explores **all action-attempt prefixes of
length 0–6** using five actions (`report`, `acknowledge`, `start`,
`resolve`, `reset`): `1 + 5 + 25 + 125 + 625 + 3125 + 15625 =
19,531` inspected prefixes. Its independent transition oracle checks
expected state, rejection of invalid inputs, preservation of the active asset,
reset semantics and immutability of the caller's state. Every active
fictional state must also produce a timeline that passes the traceability
checker and remain eligible under the separate eight data-quality rules.
The bound is fixed: this is not mathematical proof of arbitrary-length traces
or verification of the authenticated backend's transactional behavior.

The [fault experiment module](../frontend/src/demo/traceability-experiments.ts)
starts independently from the already documented fictitious log `L007`.
Eleven cases cover its unchanged baseline, removed history, wrong array shape,
incorrect opening, broken transition, impossible timestamp, backwards event,
after-snapshot event, missing actor, final-state mismatch, and four overlapping
contradictions in the **same** row. Together they trigger all nine history
diagnostic codes. Experiments are clones and never rewrite the fixture; every
case remains eligible under the *separate* base quality rules, showing why
basic row validity cannot imply timeline evidence validity.

The [interactive fault lab](../frontend/src/components/LifecycleFaultLab.tsx)
lets a reviewer select these bounded experiments on the public **guest-only**
Demo Insights page. A selection does not create a real incident or persist
data. Regression checks live in
[demo-exhaustive-lifecycle.test.cjs](../frontend/tests/demo-exhaustive-lifecycle.test.cjs)
and run within `npm run test:demo`. The deterministic scientific report
(schema v3) now includes `scenarioModelCheck` and
`lifecycleFaultExperiments` as additional sections, alongside the unchanged
cohort and original sensitivity experiments.

## UTC chronology boundary laboratory (development branch)

The [independent temporal experiment module](../frontend/src/demo/temporal-boundaries.ts)
constructs **12 separate fictional event histories** rather than mutating the
committed 12-row dataset. Its fixed cases test the inclusive
`23:59:59.999Z` observation endpoint, the first millisecond after the
snapshot, reversed event times, a valid 2024 leap day, an impossible 2025
leap day, noncanonical `+03:00` offsets, missing timezone suffixes,
year rollover, future-dated openings, missing histories and simultaneous
recorded event timestamps.

For each case the module retains an **explicit expected classification**
and the **observed classification** under two different assessors:
the eight base-data eligibility checks and the nine history checks.
A `matchesExpected=false` result remains visible as an unresolved
discrepancy; it is never silently converted to a passing result.

The [interactive UTC lab](../frontend/src/components/TemporalBoundaryLab.tsx)
is a client-only read-only view with no persistence or API calls. The
[boundary tests](../frontend/tests/demo-temporal-boundaries.test.cjs) exercise
each expectation, dual-classification differences, leap-year rules and
immutable fixture behavior. The deterministic
`scientific-evidence.json` **schema v4** adds sanitized
`temporalBoundaryExperiments` beside the prior evidence sections.

These checks prove only bounded consistency of declared UTC timestamp
semantics; they do not validate event provenance, technician response
times, PLC behavior, equipment uptime or a production SLA.

## Explicit non-claims

Internal consistency does **not** independently prove that any transition
actually occurred, that a timestamp was server-generated, or that records
cannot be edited by a privileged database user. It does not establish WORM
retention, legally sufficient provenance, operating hours, MTTR, MTBF, failure
probability, safety approvals or operational effectiveness. This work does
not create a public API, real user accounts, production monitoring or a
production release. All [release gates](preproduction-readiness.md) stay HOLD.
