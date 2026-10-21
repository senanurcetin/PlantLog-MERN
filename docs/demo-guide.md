# PlantLog public demo

The public `/demo` route is an **entirely read-only** presentation of the industrial logbook. It uses static, fictional records bundled with the frontend. It does **not** call the API, issue JWTs, seed MongoDB, or connect to real industrial equipment.

## Quick review (no credentials, database, or backend)

```bash
cd frontend
npm ci
npm run test:demo
npm run build
npm run dev
```

**Live public demo:** https://plantlog-nexus-demo.vercel.app/demo (NEXUS 2.0 branding). Opening the project root also leads to `/demo` on this static, guest-only deployment.

Open `http://localhost:5173/demo` in local development mode. The browser route is also accessible from the login screen via **Explore demo**.

## Demonstration walk-through

1. In **Overview**, inspect totals calculated from the example asset and log records, alongside recent events.
2. In **Asset registry**, search for equipment by name, serial, category or location; filter by status.
3. Select **View logs** on a particular asset to see its associated records.
4. In **Maintenance log**, search for a title, description, status or asset; filter by event type and remove the per-asset filter.
5. In **Demo insights**, inspect type distribution, recorded intake by UTC day, and open incident/maintenance cases grouped by equipment. Selecting **View history** applies the existing asset log filter; it is a workload count, not a reliability score.
6. In **Scenario lab**, select an in-service fictional asset and advance one simulated incident through Report, Acknowledge, In progress and Resolve. Open **Demo insights** or the maintenance log to see its temporary effects. Choose **Reset simulation** to remove it.
7. Reload the page. No data can be saved, and the original fixture is restored.

## Sample data and validation

- Static fixture: `frontend/src/demo/fixture.json`.
- Data integrity checks: `frontend/tests/demo-data.test.cjs`, executed with `npm run test:demo`.
- Test constraints cover unique IDs, references, status/type enums, valid dates and a non-live data disclaimer.
- The real application still requires Express and MongoDB, and its authenticated routes remain separate.

## Static hosting

The Vercel project `plantlog-nexus-demo` uses `frontend/` as root and sets `VITE_PUBLIC_DEMO_ONLY=true` for production. In that build all other application paths redirect to `/demo` and links to login/register are replaced with source-code links, because **no backend is deployed**. The source repository is connected to Vercel on `main`.

Deploy **only** the `frontend/` directory to a static host if demonstrating `/demo` without the API. Use the root directory `frontend`, build command `npm ci && npm run build`, and output directory `dist`. For Vercel, the included `frontend/vercel.json` provides SPA rewrites for the known application routes. Other hosts need an equivalent `/demo` -> `index.html` fallback. Other authenticated application views will not be functional without their own backend.

**This route is a portfolio example, not a validated CMMS, safety system, digital twin or live telemetry source.**

The illustrative public logbook now includes a few **entirely fictional** status timelines (e.g., synthetic hydraulic service), viewable by expanding an activity item. Dates and actors are invented. The authenticated `/analytics` page is a separate backend-backed feature; the public demo does not simulate MTTR/MTBF or claim a real asset uptime measurement.

## Verified NEXUS screenshot set — 19 October 2026

Captured with actual Chrome at 1440 px desktop and 390 px mobile widths
from a local build using the same `VITE_PUBLIC_DEMO_ONLY=true` as Vercel production.
The public URL was independently verified to respond HTTP 200, and the
pre-flag public deployment passed an online real-browser navigation and logo
check. The guest-only build additionally passed a local browser verification:
`/`, `/login`, `/register`, `/dashboard`, and `/analytics` route to
`/demo`; no API calls or browser JavaScript errors occurred.

- [Overview](nexus-demo-overview.png)
- [Assets](nexus-demo-assets.png)
- [Maintenance log](nexus-demo-logs.png)
- [Mobile overview](nexus-demo-mobile.png)
- [Demo insights — desktop, 21 October 2026](nexus-demo-insights.png)
- [Demo insights — mobile, 21 October 2026](nexus-demo-insights-mobile.png)
- [Scenario lab — desktop, 21 October 2026](nexus-scenario-lab-desktop.png)
- [Scenario lab — mobile, 21 October 2026](nexus-scenario-lab-mobile.png)
- [Mobile login design](nexus-login-mobile.png) — captured **before** the
  guest-only production flag was enabled; this view is available in local
  authenticated-app mode, **not** in the guest-only Vercel deployment.

The original 20 frontend tests passed during the 19 October release.
On 21 October, 13 demo/brand/insights tests, 11 registry/session tests
and the TypeScript/Vite static build passed in an isolated Windows QA
worktree. The updated Chrome smoke test (including analytics drill-down)
also passed. Desktop and 390 px mobile screenshots were recaptured after
checking that the document viewport does not overflow horizontally.
These checks do not validate backend/MongoDB, real multi-user production
security, or conformance to a complete accessibility audit.

## Static analytics interpretation

The fourth public tab, **Demo insights**, derives all counts from the same
fictional `frontend/src/demo/fixture.json`. The eight UTC-date intake
buckets end at the fixture snapshot date and cover all sample records;
any record outside that window is counted explicitly. Open
incident/maintenance records exclude inspections and operations, which
are disclosed separately if unresolved.

**No** true failure probability, equipment uptime, downtime, MTTR, MTBF,
production throughput or safety conformance is inferred. The component
reuses the same equipment-to-log drill-down as the registry. Unit tests
in `frontend/tests/demo-insights.test.cjs` validate the cohort arithmetic,
date boundaries, empty data and missing-asset accounting.

## Scenario lab: educational interaction without productization

The fifth public tab adds **one temporary, fictional incident** to the
existing synthetic records. Visitors can advance an allowed four-stage
lifecycle, observe calculated summary changes, inspect its status history
in the existing logbook, and restore the baseline with Reset or reload.

- State exists only inside the React page instance; **no cookies, local or
  session storage, API requests, database writes, or downloads** are created.
- Visitors cannot assign an incident to an already decommissioned asset.
- The source fixture is never modified; stage transitions are deterministic
  and timestamped against the fictional snapshot, not the real clock.
- Simulator outputs are **not** a real maintenance dispatch workflow, alert,
  predicted failure, safety record, SLA, digital twin or production CMMS.
- Unit checks in `frontend/tests/demo-scenario.test.cjs` cover lifecycle
  ordering, resets, invalid transitions, recalculated analytics and absence
  of fixture mutation. The Chrome browser smoke walks the four stages and
  verifies the reset and zero-API behavior.

## Scenario lab verification — 21 October 2026

- The original eight fixture assets and twelve fixture logs were retained.
- Four deterministic lifecycle stages are verified in pure unit tests,
  including invalid transitions, decommissioned equipment rejection,
  unchanged fixture content and dynamic analytics reconciliation.
- In the local production-equivalent guest-only build, real Chrome confirmed
  a full four-stage incident and reset, including zero backend API calls.
- The desktop (1440 px) and mobile (390 px) captures come from that verified
  build. The mobile document width remained **390 px**, with no overflow.
- These checks do not represent production incident dispatch or regulatory
  safety certification.

## Scientific data-quality checks

The public Demo Insights page now reports fixture data quality separately from
workload metrics, including dangling asset references, invalid dates, timestamps
after the fixed observation date, duplicate asset/log IDs, and invalid lifecycle
statuses. An eligible record may have multiple exclusion findings: unique
eligible-row totals must not be inferred by summing issue counts. These checks
only demonstrate internal synthetic-data consistency; they do not establish
external predictive validity, actual industrial uptime, real-world causal
relationships or safety assurance.

## Controlled synthetic comparison examples

The live Demo Insights section also compares five deterministic
counterfactual fixtures: no change, one new open incident, one new open
maintenance record, one resolved incident and one unlinked incident.
Every row starts from the **same baseline** and adds at most one fictional
record. The table exposes absolute counts and differences for total logs,
open incident/maintenance cases, affected equipment and unlinked cases.

These outcomes are bookkeeping identities, **not** evidence for causal
relationships, reliability engineering coefficients, forecasting or
mechanical failure severity. The fixture remains unchanged.

## Additional data-quality and accessibility safeguards

The data-quality panel excludes **all rows carrying repeated log identifiers**
or pointing at ambiguous duplicate equipment identifiers from its eligible-row
numerator. It does not sum overlapping errors to invent a count of unique
invalid rows. Human-readable dates are not treated as valid ISO timestamps
merely because JavaScript can parse them.

The NEXUS demo provides a visible-on-focus **Skip to demonstration content**
link and honors the operating system's reduced-motion preference. The
browser smoke test checks keyboard access to the main content.
Automated checks do not constitute WCAG certification.
