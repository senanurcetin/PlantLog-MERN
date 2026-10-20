# Demo verification evidence — 21 October 2026

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
