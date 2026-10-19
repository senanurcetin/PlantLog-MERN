# NEXUS 2.0 brand integration — PlantLog

The PlantLog application is a **NEXUS-branded industrial portfolio demonstrator**. The product name stays `PlantLog`; NEXUS is its umbrella brand. No live industrial telemetry, production security compliance or simulated failure-prediction output is implied by the visual design.

## Original approved identity assets

Source: Google Drive → `Logo/NEXUS_Identity_2_0`. The source folder's README identifies the approved third Figma logo variant with a cyan–blue–lavender–violet X.

- `frontend/src/assets/nexus-logo.svg`: unchanged official transparent 1200 × 360 NEXUS wordmark.
- `frontend/src/assets/nexus-mark.svg`: unchanged official transparent 512 × 512 X symbol, used for the compact app lockup.
- `frontend/src/assets/nexus-midnight.svg`: unchanged official 1200 × 440 Midnight wordmark, retained for dark-background documents and later exports.
- `frontend/public/nexus-mark.svg`: copy of the approved X symbol used as the favicon.

The original assets are retained verbatim in the repository. `frontend/tests/nexus-brand.test.cjs` verifies their SHA-256 fingerprints to detect accidental changes; replace the expected values **only after** the user's approval of a revised source export.

## Product visual system

| Role | Approved token |
|---|---|
| Midnight | `#0B0F19` |
| Navy | `#061524` |
| Cyan | `#00E0FF` |
| Blue | `#4EA8FF` |
| Lavender | `#8F9BFF` |
| Violet | `#6E55C6` |
| Silver | `#B9C5CE` |

The palette is declared in `frontend/tailwind.config.js` and `frontend/src/index.css`. The official gradient is preserved within the source SVG files; accessible dark-blue text and buttons are used on light surfaces. Semantic warning/error/success colors continue to represent operational meaning, not brand variation.

The shared `NexusBrand` component appears in authenticated desktop/mobile navigation, the public read-only demo and the login/registration screens. The document title, favicon, responsive shell, dashboard hero and other page accents use the same system. Product workflows and existing accessible route labels remain intact.

## Verification and scope

- Run `cd frontend && npm ci && npm run test:demo && npm run build`.
- Optional browser check after building: `node --test tests/browser-smoke.test.cjs` with Playwright installed, or run the isolated full-stack onboarding scenario with test-only MongoDB.
- The existing documentation screenshots predate the NEXUS redesign and should be recaptured from a verified build before being presented as current UI evidence.
- **Brand integration in repository code is not equivalent to live deployment**. No Vercel deployment or real-browser design review is asserted without evidence.

Reference pack README and Figma design were consulted, but this change implements the UI in this GitHub repository; it does not claim an independently updated Figma file.
