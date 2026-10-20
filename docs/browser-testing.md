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

## Production visual walkthrough (NEXUS)

On 19 October 2026, the public guest-only NEXUS demo was checked using an
actual headless Google Chrome browser at 1440 × 900 and 390 × 844 viewport sizes.
Tests confirmed that the production route returned HTTP 200, the official logo
had non-zero natural image dimensions, navigation to Assets and Maintenance Log
worked, and the browser emitted no JavaScript page errors. The resulting
[current screenshots](nexus-demo-overview.png) are included in this repository.
These checks were run against the publicly hosted Vercel frontend and do not
represent live industrial system testing.

The guest-only build was then rebuilt locally with
`VITE_PUBLIC_DEMO_ONLY=true` and validated in Chrome: root and
login/register/dashboard/analytics paths redirected to `/demo`, the
official logo loaded and no HTTP API calls or page JavaScript exceptions
were observed. The current documentation screenshots were recaptured
from this **production-equivalent local build**. They are not evidence
of a live backend.

## Demo Insights verification — 21 October 2026

The public demo gained a fourth, fixture-backed analytics tab. Local Chrome
smoke tests confirmed it opens, exposes four unresolved maintenance/incident
entries across three equipment assets, and drills into the existing asset log
history. This is a descriptive snapshot, not a real maintenance KPI.

The updated build passed 13 demo/brand tests, 11 registry/session tests and
the Vite/TypeScript build. Full-page screenshots were captured for
[1440 px](nexus-demo-insights.png) and
[390 px](nexus-demo-insights-mobile.png) viewports after verifying
`document.documentElement.scrollWidth === innerWidth` at both sizes.
Screenshots were taken from the production-equivalent local guest-only build.

## Scenario laboratory browser check — 21 October 2026

The production-equivalent guest-only frontend successfully completed a local
Chrome walkthrough of Report → Acknowledge → In progress → Resolve → Reset.
The browser test verified the temporary 13-entry analytics summary and
the restored 12-entry baseline. No REST API calls are performed.

Additional visual checks captured
[desktop](nexus-scenario-lab-desktop.png) and
[mobile](nexus-scenario-lab-mobile.png) at 1440/390 px respectively,
confirming the document width matched each viewport. These are fictional
demonstration interactions, not persisted incident operations.

## Evidence Lab desktop/mobile accessibility audit

On 21 October 2026, the six public demo tabs were inspected in desktop
(1440 px) and mobile (390 px) Chrome using axe-core 4.10.3 WCAG 2 A/AA,
2.1 A/AA and 2.2 AA rules. Keyboard focus of horizontally scrollable
evidence and intake sections was addressed by semantic named regions
and `tabIndex=0`. The navigation selection no longer color-animates
between low-contrast intermediate states. Automated axe checks cover
detectable issues only; a manual screen-reader and accessibility review
would still be needed to certify WCAG conformance.
