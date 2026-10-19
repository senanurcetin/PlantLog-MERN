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

The supported statuses include `in_progress`; older `open`, `acknowledged` and `resolved` values remain supported. Direct resolution of `open` is retained for existing client workflows. Resolved records are now immutable through the REST API. Corrections must be captured as new entries, rather than silently rewriting historical titles, descriptions, metrics or status. This is an *application-level status audit trail*, not cryptographically tamper-evident or WORM logging. Administrative database access may modify records.

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

## Cohort breakdown and unresolved aging

The authenticated analytics response also reports type-level cohorts for `incident` and `maintenance`: each includes `records`, `unresolved`, `eligibleResolved`, and `legacyOrIncomplete`. Type subtotals reconcile to the top-level counts.

The `unresolvedAge` counts classify **unresolved** cases with a verified server-recorded opening event into `under24Hours`, `from24To72Hours`, or `over72Hours` based on `to - reportedAt`. Missing, inconsistent or out-of-cohort opening timestamps are assigned to `unknownStart` rather than being estimated from a modification timestamp. Age is **time since reporting**, not equipment downtime, an SLA breach or time spent actively repairing.

Cohort membership is determined from `createdAt`, consistent with the MongoDB query and the advertised creation-date population. For trusted event metrics, `reportedAt` and its corresponding `statusHistory` opening event are validated separately. These breakdowns describe recorded cases only and do not estimate failure frequency or reliability.

## Equipment-level open case workload (authenticated)

`GET /api/analytics/equipment?days=30` summarizes incident and maintenance
records that **were created within the selected rolling window and are still
unresolved**. It is not an all-time outstanding backlog, a reliability ranking,
or a predictive failure-risk score. Existing assets are ordered by open case
count, then incident count and serial number; the first ten are shown.

The response includes `totalOpenCases`, `linkedOpenCases`,
`missingAssetCases`, `displayedOpenCases`, `remainingOpenCases`,
`totalEquipment`, and `displayedEquipment`. Every open case is accounted for:
`totalOpenCases = displayedOpenCases + remainingOpenCases + missingAssetCases`.
Deleted/unlinked asset references remain visible in the missing-asset total.
Equipment names/statuses come from current registry entries, not log texts.
Detail links lead to full per-equipment histories, including records outside
the analytics cohort.

This demonstrator does not infer downtime, failure probability, service
priority, MTTR, or MTBF from these counts. For large production histories
use a paginated/aggregated backend and a documented retention policy.

## Recorded case intake trend

The maintenance cohort response includes `intakeBuckets`, an array of 1–7
equal-duration UTC windows that together cover the chosen rolling period.
Each bucket counts **newly created** incident and maintenance records, regardless
of whether the case has subsequently been resolved. A record on the reporting
endpoint falls into the final bucket; counts reconcile to `records`. The
periods are defined by elapsed UTC time, not local calendar midnights.
These counts are workload intake, **not failure rate, downtime, or MTBF**.

### Open unresolved cases outside the reporting window

The equipment-workload response additionally exposes three **separate**
counts of open incident/maintenance cases **not included** in its ranked
creation-date cohort: `olderOpenCases` (created before the window),
`undatedOpenCases` (missing/null creation date), and
`futureDatedOpenCases` (creation date after the observation endpoint).

A period with zero newly created open cases is not necessarily a plant with
zero maintenance backlog. These counts are obtained from separate database
queries and are not a transactionally consistent snapshot during concurrent
writes. They are descriptive only, not downtime or failure-rate measurements.
