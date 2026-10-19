# Browser smoke test

The `frontend-browser` job in GitHub Actions starts the built Vite preview on loopback, launches a real Playwright Chromium browser, and verifies the public `/demo` experience.

It checks: direct route loading, synthetic dashboard content, asset search and status filtering, per-asset log drill-through, maintenance log search, expanded example status timeline, empty states, and local form-validation behavior on `/register`. It also asserts no API requests are made during the guest demo or while the invalid registration form is rejected.

To run locally with Node 20+, from `frontend/`:

```bash
npm ci
npm run build
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
node --test tests/browser-smoke.test.cjs
```

If a browser assertion fails, the test writes `test-artifacts/browser-smoke-failure.png`, which CI uploads only on failure.

## Authenticated end-to-end workflow

The same CI job also runs `tests/fullstack-onboarding.test.cjs` against a **temporary local MongoDB service** and an actual Express backend. It uses one randomly generated operator account and a randomly named database. It signs up, creates an equipment record, logs an incident, acknowledges/starts/resolves that incident, verifies analytical eligibility, views its asset history, signs out and confirms incorrect login credentials display an inline error. It never uses an external service or real credentials.

Run locally only with disposable MongoDB on loopback port 27017 after installing and building `backend/` and `frontend/`, plus installing the pinned Playwright browser dependencies shown above:

```bash
cd frontend
node --test tests/fullstack-onboarding.test.cjs
```

The test spawns local Vite preview and Express processes, generates its own JWT test secret, and removes the isolated database. It does not verify multi-user race conditions, site accessibility conformance, or remote deployment. No external production use is authorized by these tests.

Authenticated CI browser tests use backend defaults with a generated signing key and local MongoDB. Production-mode self-signup is disabled by default; the Docker Compose demo overrides this setting **only while the API stays bound to loopback**. See README for network and credential exposure limits.
