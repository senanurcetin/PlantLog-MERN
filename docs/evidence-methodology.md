# Evidence Lab — controlled synthetic-data audit

**Purpose:** reproduce data-quality effects in a portfolio demonstration, without real-world safety, performance, predictive-maintenance or manufacturing claims.

## Dataset and observation window

- Source: `frontend/src/demo/fixture.json`, a fixed synthetic snapshot dated **2026-10-18**.
- Population: eight fictional assets, twelve fictional log entries.
- Observation endpoint: 2026-10-18 23:59:59.999 UTC.
- No randomisation or external inference. Each comparison starts from the **same reference dataset**; exactly one attribute of one record is changed, and only a temporary copy is audited.
- The source fixture is never modified. No browser storage, API or database is involved.

## Denominators, invariants and admissibility

| Metric | Definition |
|---|---|
| Sample records | Every log in the fixed fixture, including routine logs |
| Unlinked records | Log entries whose `assetId` has no corresponding asset `id` |
| Duplicated IDs | Each repeated identifier beyond its first appearance |
| Incomplete case histories | Incident and maintenance logs with missing, non-sequential, inconsistent, after-observation or otherwise untrustworthy audit transitions |
| Qualified resolved cases | Resolved incident or maintenance cases whose opening event matches their original created timestamp, followed by ordered permitted transitions and a matching resolution status |
| Future-dated records | Events with a creation timestamp after the observation endpoint |
| Invalid dates | Record creation timestamps missing or not parseable as ISO timestamps |

Audited histories require a first `null → open` event at the log timestamp, a known actor, nondecreasing UTC event times, transitions in the allowed lifecycle graph, and a final state matching the log status. Missing history is **not imputed** from `createdAt`, `updatedAt` or human-readable notes. Log status alone cannot substantiate elapsed time.

**The qualified report-to-close duration is not an industrial reliability KPI.** No claim about MTTR, MTBF, actual machine downtime, failure probability, uptime or SLA compliance follows from these fictional entries. Further, the sample is small, nonrepresentative and artificially authored. It cannot support statistical generalization.

## Controlled cases

| Variant | One changed attribute | Expected, falsifiable change |
|---|---|---|
| Reference | None | 12 logs, 0 unlinked, 0 duplicate IDs, 4 incomplete case histories, 1 qualified resolved case |
| Broken asset link | `L012.assetId = MISSING-EQUIPMENT` | Unlinked records and unlinked open cases each increase by 1; no record-count change |
| Missing audit history | `L007.statusHistory = []` | Incomplete histories increase to 5; qualified resolved cases decrease to 0 |
| Duplicate record ID | `L009.id = L010` | One duplicate ID is flagged; original record count is preserved |
| Future-dated record | `L011.date = 2026-10-19T02:10:00Z` | Future-dated records and out-of-window intake entries each increase by 1 |

The reference `L007` report-to-close interval is 215 minutes. It is deliberately labeled **report-to-close**, not repair time. Eligible durations are never treated as a missing-data estimate.

## Reproduction and test evidence

Use `cd frontend && npm ci && npm run test:demo && npm run build`.
The `frontend/tests/demo-evidence.test.cjs` suite tests fixed reference metrics, each controlled contrast, immutability, invalid transitions and exclusion logic. The interactive Evidence Lab reads exactly this pure, deterministic module. It remains a static guest-only demonstration, not productization.
