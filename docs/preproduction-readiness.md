# PlantLog — Pre-production engineering readiness

**Status: PRE-PRODUCTION / NOT RELEASED / NO PRODUCTION AUTHORIZATION**

PlantLog is an advanced full-stack software engineering demonstrator. Its
public Vercel URL serves only a guest-mode, synthetic, API-free portfolio
view. The Express/MongoDB system exists for loopback-only local development,
disposable CI integration tests and controlled engineering evaluation. **A
deployment marked `production` by Node.js, Docker build stages or Vercel
does not mean the industrial application was released to production.**

## Demonstrated engineering capabilities

| Capability | Evidence available | What is *not* proven |
|---|---|---|
| Identity & authorization | Short-lived audience/role/version-bound JWT, account-wide logout revocation, inactive-account enforcement and MongoDB HTTP tests | Per-device token revocation, recovery, SSO, federation and independently reviewed identity security |
| Pre-production audit diagnostics | Allowlisted auth/asset/log outcomes with actor/resource IDs, minimal MongoDB records, 30-day TTL metadata and supervisor/admin cursor listing | Atomic delivery, immutable/tamper-evident evidence, SIEM, validated retention, archival and privacy assurance |
| Registry & operational records | Validated writes, asset state transitions, server-stamped histories, optimistic version checks, browser operator journey | A certified maintenance/asset management workflow |
| Analytics | Reconciled cohort counts, eligibility/exclusions, synthetic scientific experiment reports | Downtime, MTTR/MTBF, failure rates, production reliability or causal effects |
| Supply of test evidence | TypeScript, unit/integration/Chromium tests, bundle limits and archived deterministic fixture JSON | Security certification, load testing, multi-region availability |
| API health & lifecycle | Separate liveness/readiness checks, MongoDB ready-state gating and graceful SIGTERM/SIGINT draining | Dependency deep ping, HA failover or an orchestrated production rollout |
| Network exposure | Docker host port binding restricted to 127.0.0.1 and API loopback-by-default | Safe Internet exposure or hardened reverse proxy ingress |
| Public NEXUS demo | Vercel static guest-mode UI and browser-tested synthetic datasets | A live production backend, industrial sensors or customer service |

## Networking and runtime contract

All three local Compose services publish only to loopback:
`127.0.0.1:8081` (Nginx frontend), `127.0.0.1:5000` (Express API),
and `127.0.0.1:27017` (MongoDB). The backend binds to `0.0.0.0`
**inside the container** solely through an explicit
`PLANTLOG_INTERNAL_CONTAINER_NETWORK=true` flag; its *host* mapping
remains loopback. A standalone API listener otherwise binds to
`127.0.0.1`, including when `NODE_ENV=production`. Changing Compose
ports, networking, containers or proxying this API requires a fresh threat
assessment; the runtime flag alone is not a perimeter control.

`GET /api/health/live` returns **200** while Express responds, independent
of MongoDB. `GET /api/health/ready` returns **200** only if Mongoose is in
ready state and shutdown draining has not started, otherwise **503**.
Health responses are `no-store` and reveal no connection strings or user
data. The original `/api/health` remains for compatibility but it is
**liveness only and must never be used as the readiness probe**. Readiness
uses the connection state; it does not prove a fresh database query, backup
health or external system reachability. SIGTERM/SIGINT drain new requests,
stop the listener and close Mongoose, with a bounded ten-second deadline.
Compose starts dependent services after healthchecks pass; this is local
startup sequencing, not a high-availability strategy.

### Check locally

```bash
# Generate an independent strong JWT_SECRET in your own environment first.
docker compose config
docker compose up --build -d
curl -fsS http://127.0.0.1:5000/api/health/live
curl -fsS http://127.0.0.1:5000/api/health/ready
docker compose ps
docker compose down
```

Inspect `docker compose ps` for expected healthy services. Avoid `down -v`
unless erasure of the *local demo* database is intended. Tests assert
loopback mappings and readiness conditions, but no claim of real Docker
execution is made until an actual engine check is recorded.

## Authenticated local session contract

- **JWT scope:** signed HS256 tokens declare their intended issuer, API audience,
  account ID, account role, and monotonically increasing account token version.
  A valid signature alone is insufficient. Every protected request checks
  account activation, the currently stored role and the current token version
  from MongoDB, so role edits do not implicitly elevate existing bearers.
- **Lifetime:** default eight hours; `JWT_EXPIRE` must explicitly specify a
  value between 15 minutes and 24 hours in `m`, `h` or `d` units. The
  server refuses invalid settings at startup. Previously issued JWTs lacking
  these claims are intentionally rejected; test operators must sign in again.
- **Logout:** `POST /api/auth/logout` requires a valid bearer and atomically
  increments the user-level token version. This revokes **all previously
  issued bearer tokens for the account**, not just the active tab or one
  device. A concurrent or replayed logout cannot increment it twice.
- **Frontend:** credentials are kept in JavaScript-accessible
  `sessionStorage` rather than durable `localStorage`. Existing legacy
  localStorage credentials are removed when the application loads. Logout
  requests server revocation and always clears local credentials even if
  the request fails; **offline logout does not guarantee remote revocation**
  until the token expires or the server receives a valid logout.
- **Limitations:** browser token storage still exposes the bearer if a script
  injection executes in the application origin. No refresh-token family,
  device-scoped sessions, replay-resistant proof-of-possession, validated
  SSO, account recovery or signing-key rotation exists. These remain
  pre-production design questions, not completed release approvals.

## Local audit-event prototype

The [auditable operation-event protocol](audit-trail-protocol.md) defines a fixed
security/write action taxonomy, credential-free event fields and access to a
restricted, paginated event feed. Persistence occurs after each HTTP response
and is **best-effort, not atomic with mutations**; a durable legal/industrial
audit system would need failover, tamper-evidence, operations and privacy review.

## Recovery and competing-write engineering evidence

The [pre-production recovery/concurrency protocol](preproduction-recovery-concurrency.md)
documents a CI-only logical `mongodump` → isolated `mongorestore` exercise
of fabricated account, asset, log and audit data, verifying SHA-256
document fingerprints, index metadata, links and status history. The real
backup archive is deleted and **never** uploaded. Conditional `If-Match`
revision headers and MongoDB atomic CAS are also exercised via API
integration tests. Neither exercise substitutes for real disaster recovery,
offsite backup security or load/soak certification.

## Bounded load and connection resilience evidence

The [pre-production synthetic load/resilience protocol](preproduction-load-resilience.md)
documents a dedicated CI job using a temporary loopback MongoDB database,
150 HTTP requests at maximum concurrency eight, authenticated analytics/registry
reads and unauthenticated denial checks. A sanitized JSON artifact reports
status distributions and observed latency percentiles. The same local test
disconnects and reconnects MongoDB to exercise HTTP health readiness (503
during disconnect, 200 after reconnect). **No SLO, multi-node fault tolerance,
sustained capacity or production monitoring has been established.**

## Dependency provenance and advisory evidence

The [dependency/SBOM protocol](preproduction-supply-chain.md) defines
canonical npm registry locks (with SHA-512 tarball integrity), automated runtime/high+ advisory blocking, full dependency
vulnerability reporting and runtime CycloneDX inventories for the frontend
and backend. CI checks the lockfiles and archives inventory evidence but
does **not** certify dependency origins, build-tool supply chains or
artifact signing. All formal release gates remain HOLD.

## Browser accessibility and build-tool security checks

The [static guest accessibility protocol](preproduction-accessibility.md)
describes an `axe-core`/Chromium WCAG 2/2.1 A/AA heuristic scan across
five synthetic public-demo views at desktop/mobile sizes (ten scans).
Serious or critical automated violations fail CI; all lesser and incomplete
findings remain archived. This does **not** verify the authenticated
application, screen readers, assisted interaction or manual WCAG compliance.
The Vite development/build toolchain is moved to the patched 6.4.5
maintenance release with npm supply-chain checks and browser regressions.

## Release gates — ALL HOLD until specifically verified

| Gate | Required before external use | Current assessment |
|---|---|---|
| G01 | Threat model, independent auth/security review, penetration test | **HOLD — not performed** |
| G02 | TLS, restricted ingress, distributed abuse prevention and WAF policy | **HOLD — local process limits only** |
| G03 | Session security: isolated storage, session revocation, recovery, key rotation | **HOLD — tab-scoped JS-readable bearer storage; no recovery, device-specific revocation or verified rotation** |
| G04 | Audit retention, privacy, personal-data minimization, GDPR/KVKK review | **HOLD — minimal 30-day TTL prototype implemented, but unreviewed retention, deletion and legal compliance** |
| G05 | Database backup/restore, disaster recovery and credential rotation drill | **HOLD — synthetic same-container logical restore tested in CI; real recovery, RTO/RPO and key rotation unverified** |
| G06 | Load, soak, availability and concurrency benchmarks, error budgets | **HOLD — bounded 150-request localhost observation and two-writer CAS tested; no capacity/soak/SLO evidence** |
| G07 | Accessibility audit with manual assistive-technology evaluation | **HOLD — automated axe guest audit added; manual assistive technology and authenticated flows not certified** |
| G08 | Dependency/SBOM scanning, supply chain attestation, branch protections | **HOLD — runtime advisory gate, official npm lock sources and SBOMs added; no provenance signing, dev-tool risk sign-off or independent enforcement review** |
| G09 | Real operational data permissions, domain expert review and safety sign-off | **HOLD — synthetic fixture only** |
| G10 | Production monitoring, incident response, on-call ownership and rollback | **HOLD — local readiness disconnect/reconnect checked; no monitored production service or incident response** |

The project is considered **engineering-demo ready** when verified tests
pass at the exact source commit and all known limitations are clearly
disclosed. That milestone is NOT a go-live release. Production authorization
would require explicit independent approval and evidence for **every**
release gate above, regardless of green CI or Vercel READY status.

## Change discipline

Changes to authentication, MongoDB schema, networking, request validation
or role policy require matching unit/integration tests. UI edits must preserve
the guest-only no-API and synthetic fixture constraints. Prefer focused PRs
with verified checks; do not deploy the authenticated backend publicly,
create live customer accounts, seed real incident data or claim compliance.
