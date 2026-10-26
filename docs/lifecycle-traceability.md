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
  `schemaVersion: 5` and retains `lifecycleTraceability`: category totals,
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
(introduced in schema v3) includes `scenarioModelCheck` and
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
`scientific-evidence.json` first added sanitized
`temporalBoundaryExperiments` beside the prior evidence sections.

These checks prove only bounded consistency of declared UTC timestamp
semantics; they do not validate event provenance, technician response
times, PLC behavior, equipment uptime or a production SLA.

## Six-cell evidence intersection and anonymous review

The [cross-axis analyzer](../frontend/src/demo/evidence-matrix.ts)
**joins two independent assessments by input row position**, never by
log ID: missing or duplicate IDs are among the reasons a row can be
excluded, so an ID join could silently discard a disputed row.

Each fictional row belongs to exactly one cell of a **2 × 3 matrix**:
basic eligible/excluded × history internally consistent/unrecorded/invalid.
Six separately cloned synthetic mutations demonstrate all six combinations.
The [read-only inspector](../frontend/src/components/EvidenceMatrixLab.tsx)
shows both the six-cell counts and a row-level reason ledger using
one-based row positions; no source log IDs, names, actor fields or timestamps
are copied to the ledger. Multiple codes may describe the same row.

**Duplicate-ID accounting matters:** dataset-level duplicate counts measure
extra copies, whereas *every row sharing an ambiguous identifier* is excluded.
A row-level `DUPLICATE_LOGS` reason therefore need not sum to the
aggregate duplicate count. The eligibility denominator is always the number
of distinct input **positions**, not the sum of overlapping reason counts.
The same rule applies to duplicated equipment identifiers.

The deterministic report is now **schema v5** and includes
`evidenceIntersection`: the six cells, anonymous decisions for the fixed
fictional data and a controlled six-row probe. This adds a separate review
dimension, not field provenance, cryptographic authenticity, safety
certification or a probability of failure. Regression tests reside in
[demo-evidence-matrix.test.cjs](../frontend/tests/demo-evidence-matrix.test.cjs).
This development remains isolated from production release gates.

## Offline evidence artifact checks

The [read-only offline verifier](offline-evidence-verification.md) checks
the canonical, schema-v5 scientific artifact against an independent
reconstruction from the checked-out synthetic source and fixture.
Mismatches and truncation are rejected rather than repaired.
Its SHA-256 digest only labels the reproducible local bytes; it cannot
prove the historical authenticity of an industrial maintenance event.

## Actual-browser review of synthetic laboratory controls

Besides pure fixture tests, [the guest browser smoke](../frontend/tests/browser-smoke.test.cjs)
checks the fault-lab selectors, UTC chronology distinctions, anonymous
six-cell matrix, temporary scenario population and reset in Chromium.
Both matrix tables must be keyboard-focusable at mobile width and all
simulated interactions must avoid authenticated `/api/` requests.
The [automated accessibility audit](../frontend/tests/accessibility-audit.test.cjs)
also covers selected diagnostic states at desktop and mobile sizes.
These checks are bounded UI regressions, not a proof of industrial
maintenance event authenticity or complete accessibility conformance.

## Anonymous synthetic evidence review queue

The [review-queue model](../frontend/src/demo/review-queue.ts) turns the
existing six-cell matrix into an **exclusive documentary-review worklist**:
basic data contradictions, contradictory stored transitions, unrecorded
history, or internally consistent recorded history. This is a document
checking order, **not** an industrial urgency or safety-risk ranking.

The [interactive workbench](../frontend/src/components/EvidenceReviewWorkbench.tsx)
shows category counts, row positions and original diagnostic codes. It
supports both the fixed fictional sample and six controlled matrix cases,
plus keyboard-accessible filtering. An excluded record retains any independent
history contradictions; it is counted **only once** in its review category.
The workbench never changes underlying statuses, approves work, creates a
ticket or upgrades uncertain history to verified.

The baseline contains **9 rows needing source review** because their status
history was not recorded, and **3 internally consistent recorded histories**.
The six synthetic cross-axis probes yield **3 basic-data**, **1 conflicting
history**, **1 unrecorded history** and **1 internally consistent** case.
The counts follow a temporary simulated case and revert when it is reset.

The [review queue regression](../frontend/tests/demo-review-queue.test.cjs)
tests conservation of records, overlapping faults, row reordering,
missing input, adversarial category inconsistencies and temporary in-memory
simulation. This queue is **derived from existing schema-v5 evidence**;
the serialized report format and offline verifier remain unchanged.

## Intersection filters and non-additive diagnostic counts

The [pure review-filter module](../frontend/src/demo/review-filters.ts)
adds three **combined** criteria to the existing read-only workbench:
the exclusive documentary category, the *original* history classification,
and the independent diagnostic code. Unlike a category-only view, this
allows reviewers to find an excluded base-data row that **also** has an
invalid recorded transition. Nothing is reclassified or approved by
selecting a filter.

Diagnostic facet counts denote **unique affected input positions per
diagnostic**. They are not a partition: one row can produce both
`UNLINKED` and `INVALID_TRANSITION`, and a diagnostic may appear in
both excluded and eligible rows. Therefore, do not add issue totals to
estimate unique rows. The six controlled examples expose three
`UNLINKED` rows, two `INVALID_TRANSITION` rows and two
`MISSING_HISTORY` rows; these seven diagnostic occurrences refer to
five affected source rows, while the sixth has no diagnostic. The display
does not reveal names, equipment IDs or real event data.

The [filter regression tests](../frontend/tests/demo-review-filters.test.cjs)
cover multiple simultaneous criteria, empty intersections, duplicate
diagnostic membership, immutable original classifications, invalid options,
zero-row fixtures and one temporary simulated entry. Browser and axe
checks cover combinations at mobile and desktop viewport sizes.
The scientific JSON artifact remains schema v5 and is unaffected.

## Explicit non-claims

Internal consistency does **not** independently prove that any transition
actually occurred, that a timestamp was server-generated, or that records
cannot be edited by a privileged database user. It does not establish WORM
retention, legally sufficient provenance, operating hours, MTTR, MTBF, failure
probability, safety approvals or operational effectiveness. This work does
not create a public API, real user accounts, production monitoring or a
production release. All [release gates](preproduction-readiness.md) stay HOLD.
