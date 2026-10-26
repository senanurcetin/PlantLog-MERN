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
  `schemaVersion: 2` and adds `lifecycleTraceability`: category totals,
  observed event count and all nine issue counters. It retains the fixture
  SHA-256, workload cohort and existing comparative experiments.
- CI checks that the generated artifact is byte-identical between runs.
  GitHub Actions archives the sanitized JSON; source fixture contents,
  hypothetical personnel names and credentials are not uploaded as evidence.

## Explicit non-claims

Internal consistency does **not** independently prove that any transition
actually occurred, that a timestamp was server-generated, or that records
cannot be edited by a privileged database user. It does not establish WORM
retention, legally sufficient provenance, operating hours, MTTR, MTBF, failure
probability, safety approvals or operational effectiveness. This work does
not create a public API, real user accounts, production monitoring or a
production release. All [release gates](preproduction-readiness.md) stay HOLD.
