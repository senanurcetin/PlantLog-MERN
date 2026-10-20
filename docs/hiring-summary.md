# Reviewer brief — PlantLog Industrial Logbook

**Role:** Full-stack application development for maintenance, asset records and shift-incident tracking. **Stage:** demonstrator, not a certified CMMS or production plant record system.

## Product problem

Replace fragmented paper/spreadsheet records with an asset registry and a searchable log workflow: a React interface, Express API, role-oriented authentication and MongoDB persistence.

| What a reviewer can inspect | Evidence |
|---|---|
| Is the workflow implemented in UI views? | [Live NEXUS read-only demo](https://plantlog-nexus-demo.vercel.app/demo), [current overview](nexus-demo-overview.png), [current assets](nexus-demo-assets.png), [current maintenance logs](nexus-demo-logs.png), [demo analytics](nexus-demo-insights.png), [analytics mobile](nexus-demo-insights-mobile.png), [mobile](nexus-demo-mobile.png) |
| How are services separated? | [Architecture diagram](plantlog-workflow.svg) and [REST application](../backend/src/app.ts) |
| How do API records map to data? | [Asset model](../backend/src/models/Asset.ts), [LogEntry model](../backend/src/models/LogEntry.ts), [API routes](../backend/src/routes/) |
| Can it be launched independently? | [Docker Compose guide](../README.md#getting-started) |
| What is verifiably tested? | [Build checks and their limits](../README.md#validation) |

## Design choices

- Separated frontend, API and database services for repeatable local setup.
- Structured equipment and operational events instead of a single untyped note stream.
- Centralized API routes and models so changes are reviewable.

## Operational boundaries

The current screenshots linked above are verified public fixture-demo captures. Older `dashboard.png`, `assets.png`, and `logs.png` show historical authenticated interface revisions, not the current NEXUS demo. The development Compose setup exposes MongoDB on the host and needs a strong unique JWT secret; it is **not** suitable for a public production deployment unchanged. A successful build is not evidence of authorization security or end-to-end functional testing.

**Before real-world deployment:** [Security policy](../SECURITY.md) · [README](../README.md).
