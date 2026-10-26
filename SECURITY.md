# Security policy

## Private vulnerability reports

Email [senanur.cetin.work@gmail.com](mailto:senanur.cetin.work@gmail.com) with subject `[PlantLog-MERN security]`, the affected version/commit, impact and safe reproduction steps. Do not post credentials, personal data or actionable exploit details in a public issue. This research/portfolio repository has no guaranteed security response or support schedule.

## Development deployment warnings

This industrial logbook is a demonstration, **not a hardened production CMMS**. Compose maps **database, API and frontend ports to host loopback only** and startup requires a JWT secret. A standalone API binds to loopback unless explicitly launched inside a trusted, private container network. Dedicated liveness and DB-connection-state readiness endpoints exist, but they are not operational certification. API signing and verification reject known placeholder or short keys.

For any future deployment outside an isolated development machine, at minimum: keep the database private, set a strong unique JWT secret via a secret manager, use TLS and restricted ingress, implement distributed authentication rate limits (the repository already has **single-process** login/signup limits), review browser token persistence and implement revocation, validate role authorization, verify audit retention and review logs for sensitive information. All external-release gates are currently **HOLD**; see [the pre-production readiness matrix](docs/preproduction-readiness.md). Do not load real industrial incidents, personnel details or regulated records into the public demo.

**Local identity-session controls:** authenticated JWTs carry a version and
role bound to the MongoDB account, with explicit issuer/audience and a
default eight-hour expiry. `POST /api/auth/logout` atomically revokes every
previous token for that account; stale-role tokens must reauthenticate.
Browser credentials are stored in tab-scoped `sessionStorage`, not
`localStorage`. They remain accessible to JavaScript and require an
application-origin XSS assessment. If logout cannot reach the server, local
credentials are cleared but the remote bearer may survive until expiry.
This does not constitute device-specific revocation or independent
production security assurance.

**Audit diagnostics:** the loopback API captures an allowlisted set of
registration, login, logout, asset, maintenance and audit-read HTTP outcomes.
It records identifiers/status and never intentionally persists JWTs, passwords,
emails, request bodies or IP addresses. A supervisor/admin-only audit API and
MongoDB 30-day TTL prototype exist, but event writes are post-response and
nontransactional. This is not immutable evidence or a verified retention
policy. See [audit methodology and limitations](docs/audit-trail-protocol.md).

**Dependency provenance:** locked npm package URLs are canonical
`registry.npmjs.org` with SHA-512 tarball integrity. CI archives CycloneDX
runtime SBOMs and both runtime/all-dependency audit summaries, blocking
high/critical **runtime** advisories. Build tooling and deeper software
supply-chain security still require formal review. See
[supply-chain verification contract](docs/preproduction-supply-chain.md).

No external PLC or safety-rated control integration is provided.
