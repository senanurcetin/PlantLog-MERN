# Contributing to PlantLog-MERN

PlantLog is a React/Vite frontend, an Express/TypeScript API and a MongoDB database. Contributions should preserve the existing frontend-backend contract and avoid introducing live industrial data.

## Build checks

```bash
cd backend
npm ci
npm test
cd ../frontend
npm ci
npm run test:demo
npm run build
```

Security policy unit tests run alongside the backend build. The separate `npm run test:integration` command requires MongoDB on local port 27017 and runs the HTTP API lifecycle in an isolated, short-lived test database. Browser end-to-end tests are still needed. Include manual verification steps and test evidence for changes affecting login, assets, maintenance or incident workflows.

## Pull requests

- Describe affected routes, persisted fields and any migration implications.
- Use synthetic fixtures; do not commit credentials, personal data or real plant records.
- Review authorization boundaries and update the README for changed setup, ports and environment variables.

All authenticated API, environment and Compose networking changes must also preserve the local-only binding and readiness contract in [the pre-production readiness matrix](docs/preproduction-readiness.md). Passing CI does **not** authorize Internet-facing backend deployment.

See [SECURITY.md](SECURITY.md) for private vulnerability disclosure.
