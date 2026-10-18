# Contributing to PlantLog-MERN

PlantLog is a React/Vite frontend, an Express/TypeScript API and a MongoDB database. Contributions should preserve the existing frontend-backend contract and avoid introducing live industrial data.

## Build checks

```bash
cd backend
npm ci
npm test
cd ../frontend
npm ci
npm run build
```

Security policy unit tests run alongside the backend build, but there is not yet a database-backed API integration or end-to-end test suite. Include manual verification steps and test evidence for changes affecting login, assets, maintenance or incident workflows.

## Pull requests

- Describe affected routes, persisted fields and any migration implications.
- Use synthetic fixtures; do not commit credentials, personal data or real plant records.
- Review authorization boundaries and update the README for changed setup, ports and environment variables.

See [SECURITY.md](SECURITY.md) for private vulnerability disclosure.
