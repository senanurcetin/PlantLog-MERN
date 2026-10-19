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
5. Reload the page. No data can be edited, and no example records are persisted.

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

Captured from the live production URL with actual Chrome at 1440 px desktop
and 390 px mobile widths, after a public HTTP 200 response and an assertion that
the official NEXUS wordmark loaded. No browser JavaScript exceptions were
observed in that walkthrough.

- [Overview](nexus-demo-overview.png)
- [Assets](nexus-demo-assets.png)
- [Maintenance log](nexus-demo-logs.png)
- [Mobile overview](nexus-demo-mobile.png)
- [Mobile login design](nexus-login-mobile.png) — captured **before** the
  guest-only production flag was enabled; this view is available in local
  authenticated-app mode, **not** in the guest-only Vercel deployment.

The 20 Node frontend tests and static frontend build passed in a local QA copy.
These checks do not validate backend/MongoDB, real multi-user production
security, or conformance to a complete accessibility audit.
