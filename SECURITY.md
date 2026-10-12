# Security policy

## Private vulnerability reports

Email [senanur.cetin.work@gmail.com](mailto:senanur.cetin.work@gmail.com) with subject `[PlantLog-MERN security]`, the affected version/commit, impact and safe reproduction steps. Do not post credentials, personal data or actionable exploit details in a public issue. This research/portfolio repository has no guaranteed security response or support schedule.

## Development deployment warnings

This industrial logbook is a demonstration, **not a hardened production CMMS**. The included Compose configuration exposes MongoDB on the host and has an insecure development fallback for `JWT_SECRET`.

For a deployment outside an isolated development machine, at minimum: remove the database's public host port, set a strong unique JWT secret via a secret manager, use TLS, restrict access, validate role authorization and review logs for sensitive information. Do not load real industrial incidents, personnel details or regulated records into the public demo.

No external PLC or safety-rated control integration is provided.
