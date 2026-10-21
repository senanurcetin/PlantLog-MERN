# Reviewer brief — PlantLog Industrial Logbook

**Role:** Full-stack application development for maintenance, asset records and shift-incident tracking. **Stage:** demonstrator, not a certified CMMS or production plant record system.

## Product problem

Replace fragmented paper/spreadsheet records with an asset registry and a searchable log workflow: a React interface, Express API, role-oriented authentication and MongoDB persistence.

| What a reviewer can inspect | Evidence |
|---|---|
| Is the workflow implemented in UI views? | [Live NEXUS read-only demo](https://plantlog-nexus-demo.vercel.app/demo), [current overview](nexus-demo-overview.png), [current assets](nexus-demo-assets.png), [current maintenance logs](nexus-demo-logs.png), [demo analytics](nexus-demo-insights.png), [analytics mobile](nexus-demo-insights-mobile.png), [temporary scenario](nexus-scenario-lab-desktop.png), [scenario mobile](nexus-scenario-lab-mobile.png), [mobile](nexus-demo-mobile.png) |
| How are services separated? | [Architecture diagram](plantlog-workflow.svg) and [REST application](../backend/src/app.ts) |
| How do API records map to data? | [Asset model](../backend/src/models/Asset.ts), [LogEntry model](../backend/src/models/LogEntry.ts), [API routes](../backend/src/routes/) |
| Can it be launched independently? | [Docker Compose guide](../README.md#getting-started) |
| What is verifiably tested? | [Build checks and their limits](../README.md#validation) |

## Design choices

- Separated frontend, API and database services for repeatable local setup.
- Structured equipment and operational events instead of a single untyped note stream.
- Centralized API routes and models so changes are reviewable.

## Operational boundaries

The current screenshots linked above are verified public fixture-demo captures. The development Compose setup binds MongoDB and the API to host loopback and needs a strong unique JWT secret; it is **not** suitable for a public production deployment unchanged. A successful build is not evidence of authorization security or end-to-end functional testing.

**Before real-world deployment:** [Security policy](../SECURITY.md) · [README](../README.md).

## Advanced portfolio interaction without commercial scope

The fifth public tab, [Scenario lab](nexus-scenario-lab-desktop.png),
lets technical reviewers simulate one incident lifecycle and observe the
result in existing log and analytics screens. It stores nothing and uses
only a fixed fictional snapshot. The source fixtures remain unchanged.

The demo is not a product launch, customer-facing service, live CMMS,
industrial telemetry integration, or subscription application. Verified local
frontend tests and Chrome interactions do not remove the separate backend
production-security limitations tracked in Issue #10.
