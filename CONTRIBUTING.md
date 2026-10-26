# Contributing to PlantLog

PlantLog has a public **fictional, guest-only demo** and a **local-only authenticated Express/MongoDB engineering API**. Contributions must preserve this boundary and use only synthetic data.

## Layout

- `frontend/src/`: React/Vite application and bundled fictional fixtures
- `frontend/tests/`, `frontend/scripts/`: regressions, evidence verifier, image captures
- `backend/src/`: Express API and Mongoose schema/validation
- `backend/tests/`, `backend/integration/`: policy and disposable-database tests
- `docs/`: protocols and [current documentation index](docs/README.md)
- `docs/screenshots/`: generated visual evidence and [manifest](docs/screenshots/manifest.json)
- `.github/workflows/`: CI and screenshot regeneration

## Pull request checks

```bash
cd backend
npm ci && npm test
# With disposable localhost MongoDB available:
npm run test:integration

cd ../frontend
npm ci
npm run test:demo && npm run test:registry && npm run lint
VITE_PUBLIC_DEMO_ONLY=true npm run test:perf
npm run evidence:verify
```

The GitHub CI also runs browser smoke, full-stack onboarding, axe-core accessibility, synthetic database restore/load checks and supply-chain inspection. Use a draft PR when validation remains incomplete. A green CI result does **not** certify real industrial readiness.

## Documentation and screenshots

Keep the root README short and current; detailed evidence belongs in the [documentation index](docs/README.md), not chronological appended notes. Do not reintroduce superseded dated screenshots or reports.

Any UI change that alters screenshots should regenerate the gallery with the [capture script](frontend/scripts/capture-doc-screenshots.cjs). The separate visual evidence workflow runs only on documentation branches matching `docs/*visual-evidence*` and commits PNG files plus `docs/screenshots/manifest.json`. It must capture **all eleven views**, verify synthetic records, show no API traffic, and include a SHA-256 for each PNG.

## Security and persistence

- Never commit credentials, JWTs, personally identifying or real plant data.
- Disclose affected routes and MongoDB index/schema changes.
- Preserve local-only networking and release limits in [pre-production readiness](docs/preproduction-readiness.md).
- Preserve the unique casefold serial index and [database integrity contract](docs/mongodb-integrity-contract.md).
- Keep [synthetic restore and competing-write proof](docs/preproduction-recovery-concurrency.md) consistent with `__v` semantics.
- Do not enable public backend, registration, plant inputs or Mongo access merely to make the public demo interactive.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.
