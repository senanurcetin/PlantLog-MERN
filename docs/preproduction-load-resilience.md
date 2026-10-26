# PlantLog — bounded synthetic load and resilience evidence

**PRE-PRODUCTION engineering exercise. No real users, machines, external
backends or production load testing.** All acceptance gates for public
industrial operation remain **HOLD**.

## Test topology and isolation

GitHub Actions job `backend-load` starts a disposable MongoDB 6 service. The
script `backend/scripts/verify-synthetic-load.cjs` checks for `CI=true`
and the CI service-container identifier before connecting. Its only database
destination is `127.0.0.1:27017` with a generated
`plantlog_load_ci_<UUID>` namespace. Express starts on a random
**loopback-only** local port. No externally configurable URL or database
name is accepted. The script drops its generated database on completion and
uploads **only** aggregate measurements. It never uploads MongoDB archives,
passwords, tokens, personal information or HTTP bodies.

The fixture has one fictional operator, six fictional assets and 18 fictional
maintenance/incident entries. There are exactly **150 measured HTTP
requests**, distributed as 30 each for asset listing, log listing,
maintenance analytics, equipment analytics and unauthenticated access to a
protected route. At most eight requests are in flight at once. Authentication
is signed with a disposable test-only JWT secret and must be denied on the
unauthenticated route. Unexpected HTTP responses or network failures fail
the CI job.

The artifact `plantlog-synthetic-load-resilience` contains
`backend/test-artifacts/synthetic-load-resilience.json` with the observed
status distribution and per-route min/p50/p95/p99/max duration in
milliseconds. The measured aggregate throughput and wall-clock time are
also recorded. Values **vary** across runner executions: this is an
inspectable observation, not a deterministic throughput rating.

**No hard p95 latency limit or capacity SLO is enforced.** GitHub-hosted
shared runners, a tiny synthetic fixture, no ramp-up/warm-up profile, a single
process, a single database and a low fixed concurrency do not provide
evidence of sustained production throughput, user capacity or availability.
The test is a bounded functional smoke/stress observation, not formal
load/soak methodology.

## Fault and recovery check

After the workload, the script explicitly disconnects Mongoose while
keeping the Express listener running. It asserts:
- `/api/health/ready` is **503**, with a `no-store` response.
- `/api/health/live` remains **200**, reporting only HTTP liveness.
- Reconnecting to the **same disposable database** restores readiness
  **200** and an authenticated asset read **200**.

This is **single-process connection lifecycle testing**, not a network
partition, replica set failover, process crash, chaos testing or
multi-instance high availability. No business write is initiated during
the artificial disconnection. The check does **not** establish lost-write
recovery, exactly-once semantics, automated retry safety, distributed
rate limiting, error budgets or operational on-call preparedness.

## Reproduce safely

The normal backend tests can be run locally without this special exercise:

```bash
cd backend
npm ci
npm test
```

The `test:load:ci` exercise is deliberately refused unless the disposable
GitHub Actions service-container context is provided; it must not be run
against developer machines or real databases. The GitHub Actions
`backend-load` job is the evidence source.

## Security-evidence boundary

The regression suite separately verifies JWT scope and version revocation,
authorization, input sanitization, bounded authentication rate limiting,
local-only networking, and minimal audit event fields. None of those tests
is a penetration test or a substitute for SAST/DAST, independent review,
real-world threat modeling or verified compliance. CI results must always
be associated with the exact source commit.

**G06 (capacity/soak) and G10 (production monitoring and response)
remain HOLD.**
