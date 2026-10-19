# Maintenance lifecycle and analytical interpretation

PlantLog is a **portfolio demonstrator** for documenting equipment and handover events. This design records a reproducible event timeline but does not ingest machine signals or determine actual equipment downtime.

## State model

| Previous status | Permitted next statuses |
|---|---|
| Open | Acknowledged, Resolved |
| Acknowledged | In progress, Resolved |
| In progress | Resolved |
| Resolved | None (terminal) |

A new log begins in `open` with a server-generated `reportedAt` and an initial event in `statusHistory` containing **who**, **when**, **from** and **to**. Subsequent updates may stamp `acknowledgedAt`, `workStartedAt` or `resolvedAt`. Clients cannot submit these timestamps or edit status history through the REST API. Changes to status, timestamp and event are executed as **one atomic document update**, guarded by a document-version precondition; racing edits return HTTP 409.

The supported statuses include `in_progress`; older `open`, `acknowledged` and `resolved` values remain supported. Direct resolution of `open` is retained for existing client workflows. Terminal records still allow correction of descriptive fields by authorized users, but status cannot move backwards. This is an *application-level status audit trail*, not cryptographically tamper-evident or WORM logging. Administrative database access may modify records.

### Legacy records

Existing MongoDB documents have no historical `reportedAt` or initial transition event. They remain readable and editable, but missing history is **not inferred from** `createdAt`/`updatedAt`. Therefore imported or previously completed events may not qualify for timing calculations.

## Analytic cohort and exclusions

Authenticated endpoint: `GET /api/analytics/maintenance?days=30` (integer range 1–365; default 30). A matching UI is at `/analytics` for signed-in users.

- **Population:** incident and maintenance log entries whose creation date falls inside the requested rolling window. Operations and inspections are excluded.
- **Eligible closed case:** `status=resolved`, a trusted initial `open` event matching `reportedAt`, and a resolution event matching `resolvedAt`; these must be chronologically ordered, and the resolution must be inside the observation endpoint time.
- **Duration:** `resolvedAt − reportedAt`, converted from milliseconds to hours. The endpoint returns the mean and median across eligible cases, rounded to two decimals.
- **Unresolved:** records not yet marked resolved; counted, but not included in timing.
- **Incomplete / legacy:** resolved records without a complete event pair; counted, but not included.
- **No eligible cases:** both mean and median are `null`, never zero. API includes denominator `eligibleResolved` and explicit exclusion counts.

**Important:** This is *report-to-resolution time*, **not MTTR (Mean Time to Repair), MTBF (Mean Time Between Failures), time down or uptime**. Reliable MTTR would need actual repair-start/repair-end timestamps and consistent failure classification; MTBF additionally requires operating time and eligible failure histories.

## Test and demo evidence

- Pure policy tests: `backend/tests/maintenance-lifecycle.test.cjs`.
- Database-backed lifecycle/analytics checks: `backend/integration/api.test.cjs`, executed with a disposable local MongoDB database in GitHub Actions.
- Public `/demo` uses fictional `frontend/src/demo/fixture.json` only. A few synthetic events carry illustrative state sequences. They are not actual backend transitions and do not justify reporting industrial reliability KPIs.
- Browser E2E testing, event retention policy, audit immutability under database administrator access, rate limiting, and production security review remain separate items.
