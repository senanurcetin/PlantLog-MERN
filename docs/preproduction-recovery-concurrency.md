# Pre-production recovery and concurrency verification

**Status: engineering evidence only — NOT a production backup/DR plan.**

PlantLog's real API and MongoDB are limited to local development and disposable
CI services. The public NEXUS/Vercel experience is a static synthetic demo,
not a backed-up or operational industrial installation.

## Synthetic MongoDB restore exercise

GitHub Actions runs `backend-restore` against a fresh MongoDB 6 service
container. `backend/scripts/verify-backup-restore.cjs` refuses to run unless
`CI=true` and the exact ephemeral service-container ID is supplied. It does
**not** accept `MONGO_URI`, an arbitrary database name or any remote
connection. Its URI is hardcoded to MongoDB on `127.0.0.1:27017`.

1. Generate a random UUID and two distinct, short-lived database namespaces:
   `plantlog_restore_source_...` and `plantlog_restore_target_...`.
2. Populate the source with **entirely fabricated** operator, equipment,
   incident lifecycle and audit-event documents, using the checked-in
   Mongoose schemas and indexes. No public demo user or real tenant data.
3. Run MongoDB 6 `mongodump --archive --gzip` **inside the CI database
   container**, then `mongorestore` into the *other* namespace.
4. Compare per-collection counts and SHA-256 hashes of sorted BSON-backed
   documents serialized deterministically; compare restored index
   metadata, including the audit TTL; assert cross-collection references and
   status histories survived.
5. Drop both generated databases and erase the temporary archive in
   `finally`, including on failed verification. **Never upload the backup**.
6. Publish only `backend/test-artifacts/restore-verification.json` as
   `plantlog-synthetic-restore-proof` after a passing proof. This file
   contains counts/hashes of fictional documents and explicitly says that
   disaster recovery is **not** certified.

The test proves a logical **same-engine, same-container** archive restoration
into a separate namespace. It does not validate recovery in another cloud
region or cluster, backup encryption, access control, offsite transfer,
large datasets, snapshots under concurrent writes, incremental backups,
point-in-time recovery, recoverability of secrets, key rotation, historical
retention, or restoration RTO/RPO. It does not exercise Docker Compose's
persistent volume or an actual user backup. Thus **G05 remains HOLD**.

## Concurrency and stale-client conflict behavior

The existing update controllers already use MongoDB compare-and-swap on
`__v` so two concurrent status changes cannot both append divergent lifecycle
histories. Local authenticated API updates now additionally support an
**optional strong HTTP `If-Match`** precondition containing the quoted
decimal record revision. For example, a record at `__v: 2` accepts
`If-Match: "2"` for `PUT /api/assets/:id` or `PUT /api/logs/:id`.

- `GET /api/assets/:id`, resource creation and successful update responses
  include `ETag: "<revision>"`. Log list rows expose their current `__v`.
- A well-formed precondition inconsistent with the freshly loaded record
  returns **HTTP 412 Precondition Failed**, without modifying the resource.
- Malformed/wildcard/weak/multiple or unsafe numerical preconditions return
  **HTTP 400**, not a coerced revision.
- A write collision that occurs **after** the controller reads a matching
  revision returns **409 Conflict**, via the pre-existing atomic MongoDB CAS.
- Legacy clients without `If-Match` continue using the existing API and
  atomic CAS behavior; future clients can opt into stronger stale-edit
  protection. Resolved maintenance records remain immutable as before.

The real HTTP/MongoDB integration suite verifies stale asset and log writes,
version increments, immutable histories, malformed preconditions and two
competing updates based on exactly the same revision. One competing write
must succeed and the other return **409 or 412**, with no duplicate lifecycle
transition. This is a limited concurrency invariant, not a load/soak test,
distributed locking or multi-writer transaction proof. **G06 remains HOLD.**

## Local verification

```bash
cd backend
npm ci
npm test
npm run test:integration   # requires disposable MongoDB on 127.0.0.1:27017
```

The restore exercise is intentionally CI-only. Review the `backend-restore`
GitHub Actions job and its structured proof; do not run it against a
workstation database or replace the disposable URI/container checks.
