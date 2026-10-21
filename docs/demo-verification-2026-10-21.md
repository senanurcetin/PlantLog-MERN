# Demo verification evidence — 21 October 2026

> **Evidence scope:** These are dated local observations and historical test
> results, not a current main-branch acceptance certificate. In particular,
> GitHub Actions run [#94](https://github.com/senanurcetin/PlantLog-MERN/actions/runs/39519405248)
> failed the authenticated browser job (mobile desktop-navigation selector
> mismatch), while backend, frontend and backend-integration jobs passed.
> A fix and expanded quality assertions are under review; report them as
> verified only after checking the exact subsequent commit's CI results.
> The eight-gate rules introduced afterward supersede the six-gate inventory
> described in the historical results below.


## Scope

NEXUS PlantLog is a fictional, read-only portfolio demonstrator with a local
memory-only scenario. This report applies to the frontend development branch
`feat/demo-scientific-quality-gates` and the verified local production-equivalent
build with `VITE_PUBLIC_DEMO_ONLY=true`. It is **not** independent validation
of real-world plant reliability, an accessibility certificate, or an
industrial safety assessment.

## Scientific integrity

- Six explicitly reported quality dimensions: absent equipment reference,
  invalid timestamp, post-observation timestamp, duplicate asset IDs,
  duplicate log IDs, and unsupported lifecycle state.
- **12/12** baseline fictional records qualified under the declared check.
- Duplicate and exclusion findings are allowed to overlap. They are not
  summed to create a misleading count of unique bad records.
- Unit regression fixtures separately test malformed/missing timestamps,
  duplicate identities, overlapping exclusions, and empty input.
- No failure-risk, machine uptime, downtime, MTTR/MTBF or field observation
  estimates are calculated by these checks.

## Repeatable quality gates

| Check | Evidence |
|---|---|
| Frontend demo/brand/insights/scenario/quality tests | 19/19 passed |
| Frontend registry/session tests | 11/11 passed |
| TypeScript/Vite production build | Passed |
| ESLint | Passed |
| Backend unit tests (same source main revision) | 39/39 passed |
| Updated Playwright Chrome browser-smoke test | Passed |
| axe-core 4.10.3 WCAG 2 A/AA and WCAG 2.1 A/AA rules | Zero reported violations across five demo tabs at 390 and 1440 px after transitions settled |
| Viewport overflow (5 tabs × 6 widths) | 0 defects at 320, 360, 390, 768, 1024, 1440 px |

Automated axe results do not cover manual keyboard screen-reader testing,
WCAG AAA or all possible accessibility failures.

## Performance observation

On the isolated Windows Chrome QA host, a Vite preview running on loopback
reported `DOMContentLoaded` at **189 ms** and page load at **193 ms**, on a
single local navigation. This is **not** a Lighthouse score or an internet
latency benchmark and should not be compared to remote users. The built bundle
contained approximately 281.40 kB of JavaScript, 90.96 kB gzip, and 34.04 kB
of CSS, 7.05 kB gzip. These are build sizes, not transfer timing guarantees.

## Current public deployment and screenshot provenance

On 21 October 2026, Vercel reported the production alias
`plantlog-nexus-demo.vercel.app` READY with GitHub source
`f4120062dc31e776b2704a070aa31093de24940a`.
GitHub Actions run
[#98](https://github.com/senanurcetin/PlantLog-MERN/actions/runs/39522547576)
passed all four jobs on that same commit, including guest and local authenticated
Chromium flows. This is **deployment metadata**, not proof of live plant connectivity.

The newer screenshot collection is captured from the isolated guest-only Vite
build, not by scraping the live Vercel URL. Its
[manifest](screenshots-manifest.json) is authoritative for capture SHA,
UTC date, viewports, and which scenario state each image depicts.
The older local QA results below remain dated historical evidence.

## Visual evidence

- [Updated desktop analytics](nexus-demo-insights.png), 1440 px
- [Updated mobile analytics](nexus-demo-insights-mobile.png), 390 px

Images were captured from the production-equivalent localhost Vite preview,
not a newly deployed revision at the time of capture.

## Limitations and no-productization boundary

Backend API + MongoDB integration, real multi-user acceptance, full security
pen-testing, accessibility manual review, controlled network throttling, and
real-world scientific validity remain separate verification efforts. This
project is deliberately not commercialized: no subscriptions, billing, sales,
customer onboarding, persistent public user input, or live plant controls.

## Controlled comparisons — additional verified evidence

Five deterministic one-record comparisons are now visible below the
synthetic quality checks. Each is calculated independently from the
same original twelve-log baseline: no change, an open incident, an
open maintenance case, a resolved incident, or an intentionally unlinked
incident. Their differences are exactly reproducible arithmetic, **not**
statistical inference, risk estimates or predictions.

- 21/21 frontend demo/brand/scientific tests passed.
- 11/11 registry/session tests passed.
- TypeScript/Vite build and ESLint passed.
- Chrome browser smoke passed, including comparison table keyboard focus.
- axe-core automated WCAG 2/2.1 A/AA checks at 320, 390 and 1440 px:
  zero reported violations. Document viewport had no horizontal overflow.
- Desktop and mobile analytics screenshots were recaptured with the
  updated controlled comparisons from the local production-equivalent build.

The original fixture and approved NEXUS brand files were not modified.

## Reproducible static bundle budget

The build now has an explicit, CI-independent test at
`cd frontend && npm run test:perf`. It asserts that the compressed generated
JavaScript and CSS stay below **180 KiB JS** and **32 KiB CSS** respectively,
and that the main HTML has the NEXUS document title, bundled local icon and
no remote executable script tag. The test runs on the generated guest-only
Vite build with Node's built-in gzip implementation. These byte-count budgets
are intentionally not misleading network-speed or Lighthouse scores.
