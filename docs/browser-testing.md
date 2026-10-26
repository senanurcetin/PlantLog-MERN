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

**CI interpretation:** GitHub Actions run #94 on 21 October 2026 passed
the guest-only browser smoke but failed at a mobile visibility assertion in
the authenticated test. Its `getByRole` name query incorrectly matched
"Mobile primary navigation" when checking "Primary navigation", because
the desktop navigation is absent from the mobile accessibility tree.
The regression test now uses the desktop sidebar CSS locator and checks both
320 px and 390 px layouts. Subsequent browser assertions are not considered
verified until the revised CI job passes; the test is not evidence of a
production deployment.


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

## Scientific fixture data audit and keyboard navigation — 21 October 2026

Demo Insights now discloses unlinked assets, invalid dates, records after
the observation snapshot, duplicate asset/log identifiers and invalid
status values. Individual findings can overlap: never add finding counts
to estimate unique invalid records. No actual reliability measurements
or external scientific validity are asserted.

The eight-day chart has a labelled keyboard-focusable scrolling region.
The browser test verifies it and the fixture eligibility counts.

## Reviewer cross-filter browser regression

Playwright now checks the combined documentary category, history and
diagnostic dropdowns on the 390 px guest-only demo. It verifies overlapping
`INVALID_TRANSITION` on a basic-data-excluded case, a valid empty-result
intersection, population-switch resets and no document-level horizontal
overflow or API calls. The existing **18 automated axe scans** include
one fully intersected review state at both desktop and mobile sizes.
The tests do not certify screen-reader operation or production plant data.

## Documentary-review workbench browser checks

The local Chromium smoke additionally exercises the new read-only reviewer
queue: filtering all 12 fictional rows into nine missing histories or three
internally consistent timelines, exploring six controlled cases, confirming
three excluded rows and a separately conflicting history, and restoring the
original population. It checks the mobile table is keyboard-focusable,
has no document-level overflow, and never calls the authenticated API.
It also checks that the temporary 13th recorded scenario raises the
internally consistent category to four, and reset restores 12 rows.

Automated axe coverage adds one filtered review state at both desktop and
mobile sizes. The full suite now expects **18 scans**: five normal views
plus four selected lab states at each viewport. This automated rule coverage
does not constitute manual assistive-technology certification.

## Laboratory interaction and accessibility regression (development branch)

The guest-only Playwright smoke suite now inspects the **three scientific
panels** as real DOM interactions rather than trusting unit tests alone:

- **Lifecycle fault-injection:** select overlapping faults (four diagnostics),
  unknown status history and reset to the original valid example.
- **UTC chronology:** move from a future event to an impossible leap date,
  and then a valid leap day, checking both basic eligibility and independent
  history diagnostics.
- **Six-cell evidence matrix:** verify 12 source rows, switch to six controlled
  contradictions (one per matrix cell), check the anonymous decision ledger,
  restore the source, and confirm the matrix follows the temporary 13th
  scenario row before returning to 12 after reset.

At **390 px** the two tabular regions must remain keyboard focusable and
scroll within the panel, without document-level horizontal overflow. Browser
network interception checks there are no requests to the authenticated
`/api/` path.

The automated axe-core test now scans all five normal views **plus four
selected diagnostic states**, on both 1280 px desktop and 390 px mobile:
**18 scans** in all. All WCAG 2/2.1 A/AA checks remain enabled, and
serious/critical findings fail the test. Results are not full accessibility
certification; manual assistive technology review is still outstanding.

For local use only, run `npm ci`, `npm run build`, install the pinned
`playwright@1.56.1` and `@axe-core/playwright@4.14.0` test packages,
then set `PLANTLOG_BROWSER_CHANNEL=chrome` and execute
`node --test tests/browser-smoke.test.cjs` followed by
`node --test tests/accessibility-audit.test.cjs`. This does not create a
pull request, deploy anything, or require any database.

The new interactions remain strictly illustrative, synthetic, and
in-memory; their success does not demonstrate industrial safety or
production reliability.

