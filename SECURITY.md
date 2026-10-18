# Security policy

## Private vulnerability reports

Email [senanur.cetin.work@gmail.com](mailto:senanur.cetin.work@gmail.com) with subject `[PlantLog-MERN security]`, the affected version/commit, impact and safe reproduction steps. Do not post credentials, personal data or actionable exploit details in a public issue. This research/portfolio repository has no guaranteed security response or support schedule.

## Development deployment warnings

This industrial logbook is a demonstration, **not a hardened production CMMS**. The Compose database mapping is restricted to localhost and startup requires a JWT secret. API signing and verification reject known placeholder or short keys.

For a deployment outside an isolated development machine, at minimum: keep the database private, set a strong unique JWT secret via a secret manager, use TLS, add login rate limiting, restrict access, validate role authorization and review logs for sensitive information. Do not load real industrial incidents, personnel details or regulated records into the public demo.

No external PLC or safety-rated control integration is provided.
