# PlantLog — privacy-minimized local audit trail

**Scope:** advanced **PRE-PRODUCTION**, authenticated localhost-only API with
a disposable MongoDB backing store. The guest Vercel demo is static, synthetic
and makes no API requests. This is **not** a production audit or non-repudiation
system, WORM store, legal evidence system, or safety-certified industrial log.

## Event contract

`backend/src/middlewares/auditTrail.ts` observes completed HTTP responses for
a fixed whitelist. `auditPolicy.ts` maps only the method and route pathname
to a predefined event action. The event's outcome derives from the final HTTP
status (success for 2xx/3xx, denied for 401/403, failed otherwise).

| Action | Captured resource | Supported outcomes |
|---|---|---|
| `auth.register`, `auth.login`, `auth.logout` | authentication operation; actor ID when available | success / denied / failed |
| `asset.create`, `asset.update`, `asset.delete` | equipment record ID where known | success / denied / failed |
| `log.create`, `log.update` | maintenance record ID where known | success / denied / failed |
| `audit.read` | access to audit listing | success / denied / failed |

Event fields are fixed: `_id`, `action`, `outcome`, `statusCode`,
optional `actorId`, `resourceType`, optional `resourceId`, and server
`occurredAt`. **No freeform metadata**, request or response body, token,
password, email address, remote IP, User-Agent, query string, machine incident
description or personnel name is intentionally stored. A denied anonymous
login has **no actor ID**; an authenticated denial retains the verified user
ID. Generated resource IDs are supplied by the respective successful write
controller, not trusted from a request body.

`GET /api/audit` requires the same `supervisor` or `admin` authorization
used for privileged equipment maintenance. Operators and anonymous callers
are denied. Results are newest-first, with `limit` restricted to 1–50
(default 25), an optional validated ObjectId `cursor`, `items` and
`nextCursor`. There is deliberately **no HTTP create/update/delete** for
audit events. No email or profile population is performed. Pagination is
ordered by MongoDB `_id`, not claimed as a cryptographic chronology.

## Retention and integrity limits

The model has an **approximately 30-day TTL** index on `occurredAt`. MongoDB
TTL deletion is asynchronous; it is **not** an erasure guarantee, audited data
retention authorization, or backup purge policy. Operators do not have an
audit listing; a database administrator can still edit or erase collection
records because this is not a tamper-evident append-only ledger.

Capture runs **after the HTTP response finishes** and persists best-effort.
Domain writes and their audit event are **not transactional or atomic**;
the API may complete a successful write whose audit event was not stored due
to disconnection. Failed writes can still generate an event. Errors are
reported to server stderr using a generic fixed message only, never raw
MongoDB errors. There is no cross-process queue, delivery retry, exactly-once
guarantee, durable export/archive, alerting, SIEM integration, or disaster
recovery. Before real operation, these need an explicit design, access
review, privacy assessment, retention/erasure assessment and failure testing.
**Release gates G01, G04, G05 and G10 remain HOLD.**

## Local verification

```bash
cd backend
npm ci
npm test

# With an isolated local MongoDB listening only at 127.0.0.1:27017:
npm run test:integration
```

The unit suite checks the fixed route allowlist, outcome mapping, schema
field minimization and TTL metadata. The disposable MongoDB integration
suite verifies login denial, authenticated status changes, logout capture,
record identity, permission boundaries, bounded cursor pagination, invalid
query rejection and that passwords, emails and JWTs are never in recorded
event documents. It polls for post-response events because persistence
is deliberately asynchronous. These tests are evidence of a local
prototype, **not** external audit compliance.
