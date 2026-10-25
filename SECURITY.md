# Security policy

## Private vulnerability reports

Email [senanur.cetin.work@gmail.com](mailto:senanur.cetin.work@gmail.com) with subject `[PlantLog-MERN security]`, the affected version/commit, impact and safe reproduction steps. Do not post credentials, personal data or actionable exploit details in a public issue. This research/portfolio repository has no guaranteed security response or support schedule.

## Development deployment warnings

This industrial logbook is a demonstration, **not a hardened production CMMS**. Compose maps **database, API and frontend ports to host loopback only** and startup requires a JWT secret. A standalone API binds to loopback unless explicitly launched inside a trusted, private container network. Dedicated liveness and DB-connection-state readiness endpoints exist, but they are not operational certification. API signing and verification reject known placeholder or short keys.

For any future deployment outside an isolated development machine, at minimum: keep the database private, set a strong unique JWT secret via a secret manager, use TLS and restricted ingress, implement distributed authentication rate limits (the repository already has **single-process** login/signup limits), review browser token persistence and implement revocation, validate role authorization, verify audit retention and review logs for sensitive information. All external-release gates are currently **HOLD**; see [the pre-production readiness matrix](docs/preproduction-readiness.md). Do not load real industrial incidents, personnel details or regulated records into the public demo.

No external PLC or safety-rated control integration is provided.
