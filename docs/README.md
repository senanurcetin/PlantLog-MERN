# PlantLog documentation

This index describes the **published, synthetic NEXUS demo** and the separately verified **local engineering backend**. It replaces accumulated dated status snippets in the root README. Do not interpret a passing test as a production safety certification.

## Start here

| Document | Purpose |
|---|---|
| [Root README](../README.md) | Overview, quickstart and current architecture |
| [Current screenshots](screenshots/README.md) | Eleven reproducible UI captures and capture manifest |
| [Release verification](release-verification.md) | Pinned CI, live deployment and browser evidence with limitations |
| [Demo guide](demo-guide.md) | Fictional flows, science panels and user interactions |
| [Browser testing](browser-testing.md) | Browser/axe test commands, evidence boundaries |
| [NEXUS visual identity](nexus-brand.md) | Approved original SVG files and palette |

## Scientific protocols

| Document | Purpose |
|---|---|
| [Eligibility and sensitivity](eligibility-sensitivity-method.md) | Quality denominators, controlled perturbations |
| [Lifecycle traceability](lifecycle-traceability.md) | History faults, UTC edge cases, dual-axis evidence, documentary review |
| [Offline evidence verification](offline-evidence-verification.md) | SHA-256 canonical report verification |
| [Maintenance metrics](maintenance-metrics.md) | Cohorts, excluded observations and non-claims |

## Local API and MongoDB engineering

| Document | Purpose |
|---|---|
| [MongoDB integrity](mongodb-integrity-contract.md) | Casefold unique serial index, migration behavior |
| [Readiness and deployment limitations](preproduction-readiness.md) | Local bind, JWT, recovery and G01–G10 limits |
| [Audit diagnostics](audit-trail-protocol.md) | Minimal allowlisted action outcomes, TTL limitations |
| [Recovery and concurrency](preproduction-recovery-concurrency.md) | Disposable backup/restore and revision conflicts |
| [Synthetic load and resilience](preproduction-load-resilience.md) | Local HTTP performance and reconnection experiment |
| [Supply-chain process](preproduction-supply-chain.md) | Package integrity, advisories and SBOMs |
| [Accessibility testing](preproduction-accessibility.md) | Automated audit scope versus manual review |

## Repository policy

[Contributing](../CONTRIBUTING.md) · [Security](../SECURITY.md) · [License](../LICENSE.md)

**Documentation hygiene:** screenshots live only in `docs/screenshots/`, with a capture-specific SHA-256 manifest. Historical, superseded screenshot results are not kept as current release claims. CI test evidence remains attached to its corresponding GitHub Actions run rather than copied into the root README.
