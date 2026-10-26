# PlantLog — published synthetic demo verification

**Published guest-demo baseline:** GitHub `main` commit `6b915dae4ed7e9dcaa9188f4ffee6c065ed5135f`, merged from [PR #57](https://github.com/senanurcetin/PlantLog-MERN/pull/57).

**Deployment:** [plantlog-nexus-demo.vercel.app/demo](https://plantlog-nexus-demo.vercel.app/demo). Vercel reported production target READY with the above source SHA. The project production environment contains the `VITE_PUBLIC_DEMO_ONLY` build flag. Hosted visitors receive only read-only fictional data.

## Repeatable GitHub CI evidence

The seven jobs of [CI run 40399074044](https://github.com/senanurcetin/PlantLog-MERN/actions/runs/40399074044) passed on the feature-branch head, before the squash merge. [Main-branch CI run 40399863883](https://github.com/senanurcetin/PlantLog-MERN/actions/runs/40399863883) separately passed the same seven jobs after merge:

1. Frontend: scientific regression tests, registry/session tests, lint and guest-only build budget.
2. Frontend browser: real Chrome guest demo, authenticated test-only onboarding and mobile/desktop axe audits.
3. Backend: TypeScript compilation, authentication, data policy and Mongoose schema/index checks.
4. Backend integration: real isolated MongoDB, HTTP lifecycle, unique collated serial index, concurrent conflicting inserts and long-TLD registration.
5. Database recovery: disposable backup/restore fingerprint checks.
6. Synthetic load: bounded local HTTP requests and database connection-state recovery.
7. Supply chain: locked dependency integrity, advisories and runtime SBOMs.

## External live Chrome check

After production deployment, a headless Chrome check requested the **actual** `https://plantlog-nexus-demo.vercel.app/demo`: HTTP 200, six selectable laboratories, 12 review rows, 390 px mobile viewport without horizontal overflow, redirected public registration back to the demo, **zero API requests** and **zero unhandled page errors**.

## Current visual evidence

Eleven refreshed screenshots live in [the versioned gallery](screenshots/README.md). The [capture manifest](screenshots/manifest.json) identifies the exact visual source revision and records that capture is from a **local production-equivalent guest build**, not a direct screenshot of the hosted URL. Do not conflate the screenshot evidence with the separately performed live-site Chrome smoke check.

## Limits and release boundary

The public product is a **synthetic demonstrator**, not an authenticated industrial service. The Express/MongoDB application is tested locally and in disposable CI infrastructure but is **not Internet-facing**. Automated accessibility tests do not replace manual assistive-technology testing; synthetic recovery/load checks do not establish an SLA, a compliant incident logbook or disaster-recovery guarantee. G01–G10 operational production gates remain HOLD and do not block publication of the fictional guest demo.
