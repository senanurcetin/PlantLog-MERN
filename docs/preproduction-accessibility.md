# PlantLog — automated guest accessibility audit

**Pre-production engineering evidence, not an accessibility certification.**

The public PlantLog/NEXUS demo contains only synthetic data. A Chromium-based
`axe-core` check runs against a locally built Vite static frontend without
starting the authenticated API or accessing MongoDB.

## Automated coverage

The GitHub Actions `frontend-browser` job installs fixed CI-only versions
of Playwright and `@axe-core/playwright`, uses the system Chrome preinstalled
on the pinned `ubuntu-24.04` GitHub runner (its version is logged by CI),
then executes
`frontend/tests/accessibility-audit.test.cjs`. It tests **five** views
(overview, equipment registry, maintenance log, analytics, scenario) at
**1280px desktop** and **390px mobile** widths — **ten scans** total.
Each view is inspected with axe's `wcag2a`, `wcag2aa`, `wcag21a` and
`wcag21aa` tags. Serious/critical automated findings block CI.
All minor/moderate findings and `incomplete` checks remain visible in
`plantlog-automated-accessibility-evidence/accessibility-audit.json`.

The test also asserts no requests are made to `/api/` while inspecting
the public demo. Every scan must complete; a missing/failed scan or blocked
test must not result in a passing, empty report. There are no axe rule
exclusions and no baseline allowlist for serious findings.

## Limits and manual validation still required

axe does not cover every WCAG criterion or guarantee a meaningful accessible
experience. Dynamic focus transitions, landmarks, reading order, screen reader
announcements, touch targets, zoom at 200%/400%, high-contrast and reduced
motion modes, assistive technology interoperability and human comprehension
need separate manual testing. Color and contrast, where reported as automated
findings, must be reviewed in the actual product design context.
The authenticated local application is not covered by this static guest-only
axe job; its browser workflow is tested separately for navigation/CRUD,
not full WCAG conformance.

**Release gate G07 remains HOLD** regardless of a green CI accessibility job.

## Vite build-security upgrade

The frontend development/build toolchain is updated from Vite 5 to the
supported **Vite 6.4.5** maintenance series. Existing React 18 and
`@vitejs/plugin-react` 4.7 support this pairing. The lockfile is generated
with the official npm registry; installation, TypeScript build, bundle budget,
synthetic fixture tests, lint, full Chromium flows and npm advisory/SBOM
checks must all pass together.

The runner-supplied Chrome is not version-locked: the CI image can change.
Tests must keep a real browser (not a DOM emulation), and the installed
browser version must remain visible in the job logs.

This protects the development toolchain from advisories resolved in later
Vite 6.x releases; it does not authorize Internet-facing development servers,
guarantee an absence of future CVEs, verify artifact provenance, or close
the broader supply-chain review gate **G08**.
