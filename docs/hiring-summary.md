# Reviewer brief — PlantLog Industrial Logbook

**Role:** Full-stack application development for maintenance, asset records and shift-incident tracking. **Stage:** demonstrator, not a certified CMMS or production plant record system.

## Product problem

Replace fragmented paper/spreadsheet records with an asset registry and a searchable log workflow: a React interface, Express API, role-oriented authentication and MongoDB persistence.

| What a reviewer can inspect | Evidence |
|---|---|
| Is the workflow implemented in UI views? | [Dashboard capture](dashboard.png), [Assets](assets.png), [Maintenance logs](logs.png) |
| How are services separated? | [Architecture diagram](plantlog-workflow.svg) and [REST application](../backend/src/app.ts) |
| How do API records map to data? | [Asset model](../backend/src/models/Asset.ts), [LogEntry model](../backend/src/models/LogEntry.ts), [API routes](../backend/src/routes/) |
| Can it be launched independently? | [Docker Compose guide](../README.md#getting-started) |
| What is verifiably tested? | [Build checks and their limits](../README.md#validation) |

## Design choices

- Separated frontend, API and database services for repeatable local setup.
- Structured equipment and operational events instead of a single untyped note stream.
- Centralized API routes and models so changes are reviewable.

## Operational boundaries

Existing screenshots are historical interface captures. The development Compose setup exposes MongoDB on the host and needs a strong unique JWT secret; it is **not** suitable for a public production deployment unchanged. A successful build is not evidence of authorization security or end-to-end functional testing.

**Before real-world deployment:** [Security policy](../SECURITY.md) · [README](../README.md).
