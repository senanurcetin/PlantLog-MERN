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

This does **not** verify live authenticated API workflows in a browser. Those are currently exercised as HTTP/MongoDB integration tests; browser-based full-stack onboarding remains a separate acceptance goal in [issue #9](https://github.com/senanurcetin/PlantLog-MERN/issues/9).
