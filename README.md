# PlantLog — Industrial Asset & Maintenance Logbook

**Technical reviewer brief:** [System evidence, reproducibility and operational limits](docs/hiring-summary.md).

![PlantLog industrial operations workflow](docs/plantlog-workflow.svg)

> Designed workflow overview; not a live plant dashboard screenshot. The historical interface captures below predate the dashboard update that replaced hard-coded counts and the placeholder activity panel with API-backed metrics and recent logs.


**React · TypeScript · Node.js/Express · MongoDB · Docker Compose**

A full-stack industrial operations prototype that organizes asset records, maintenance activities and shift incidents into a single operator-facing workflow.

![PlantLog operations dashboard](docs/dashboard.png)

**Explore the zero-login demo:** open the `/demo` route on a running frontend, or follow the [demo guide](docs/demo-guide.md).

**Explore:** [Portfolio project](https://senanur-cetin.vercel.app/#projects) · [Asset registry](docs/assets.png) · [Maintenance log](docs/logs.png)

## Problem and approach

In many facilities, asset lists, shift handovers and maintenance histories live in separate spreadsheets or paper registers. PlantLog demonstrates a unified web workflow for tracking equipment and operational events, with a REST API backed by MongoDB.

## Features

- **Asset registry:** central equipment list, searchable status views and supervisor/admin status updates. Asset creation accepts only validated equipment metadata, normalizes text and starts with `operational` status; operators cannot self-assign a privileged equipment state.
- **Maintenance and incident records:** structured operational logs, forward-only state transitions, server-stamped status history and filtered CSV export with formula-safe encoding.
- **Authentication:** JWT-backed API authentication and role-oriented application flows.
- **Operator dashboard:** overview interface for operational status and recent activity.
- **Evidence-aware analytics:** authenticated `/analytics` view and `/api/analytics/maintenance` endpoint for report-to-resolution timing, with eligibility and exclusion counts. This is **not** MTTR or equipment uptime. See [metric definitions](docs/maintenance-metrics.md).
- **Separated services:** React/Vite frontend, Express API and MongoDB database.

## Architecture

```mermaid
flowchart LR
    A[React + Vite UI] -->|REST + JWT| B[Express API]
    B --> C[(MongoDB)]
    D[Docker Compose] -. runs .-> A
    D -. runs .-> B
    D -. runs .-> C
```

| Component | Implementation | Location |
|---|---|---|
| Web UI | React 18, TypeScript, Vite, Zustand, Tailwind | `frontend/` |
| API | Node.js, Express, TypeScript, Mongoose | `backend/` |
| Persistence | MongoDB 6 | Compose service `mongodb` |
| Deployment demo | Docker Compose / Nginx | `docker-compose.yml` |

## Public, read-only demo

The standalone frontend route `/demo` uses fully synthetic bundled fixtures. It needs **no account, API, MongoDB, credentials or external plant connection**. Visit the route through your hosted frontend or run `cd frontend && npm ci && npm run dev`, then open `http://localhost:5173/demo`. You can inspect KPIs, browse equipment, search/filter logs and drill into per-asset history. All interactions are read-only; there is no database persistence. See [demo guide](docs/demo-guide.md).

## Getting started

### Option A — Docker Compose (local demo)

**Requirements:** Docker Engine or Docker Desktop with Compose, and available ports 8081, 5000 and loopback-only 27017.

```bash
git clone https://github.com/senanurcetin/PlantLog-MERN.git
cd PlantLog-MERN

# Generate a strong random secret before starting the stack.
# Linux/macOS (OpenSSL):
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

On PowerShell, generate a random key using:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:JWT_SECRET = [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
```

- Web application: `http://localhost:8081`
- REST API: `http://localhost:5000/api`
- MongoDB: `127.0.0.1:27017` (bound to the local machine only)

Stop the stack with `docker compose down`; add `-v` **only** if you intentionally want to delete the database volume.

### Option B — Run services locally

**Requirements:** Node.js 20+, npm, and a running local MongoDB instance.

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set MONGO_URI and a strong JWT_SECRET
npm run dev
```

Start the frontend in a separate terminal from the repository root:

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL defaults to http://localhost:5000/api
npm run dev
```

PowerShell users can replace `cp` with `Copy-Item`.

The included Compose configuration binds both the API (port 5000) and MongoDB (port 27017) to `127.0.0.1` only. Compose explicitly sets `REGISTRATION_ENABLED=true` for this **local demo**. Server startup rejects missing or weak JWT secrets. A production environment outside Compose defaults to registration disabled unless `REGISTRATION_ENABLED=true` is explicitly set; do not enable it on public infrastructure without stronger ingress controls.

Once the backend and MongoDB are running, visit `http://localhost:5173/register` to create an **operator** account (minimum 12-character password). The local Compose frontend uses `http://localhost:8081/register`. Operators can create assets and maintenance records but cannot change asset metadata or delete assets. There is deliberately **no public privilege escalation flow**: supervisor and administrator roles require trusted out-of-band provisioning. Never expose the development registration endpoint publicly without access controls and rate limiting.

## Validation

```bash
cd backend && npm ci && npm test
cd ../frontend && npm ci && npm run test:demo && npm run build
```

The public demo additionally has a [real Chromium smoke test](docs/browser-testing.md) in GitHub Actions, distinct from the frontend build and fixture unit tests. The backend includes Node built-in policy and lifecycle regression tests for registration roles, write-field allowlists, log metrics and JWT secret configuration. The `backend-integration` GitHub Actions job additionally runs an HTTP/MongoDB lifecycle test covering authentication, role boundaries, asset CRUD rules, history-preserving deletion, lifecycle transitions and analytical exclusions. This is **not** a substitute for browser-level end-to-end testing, load testing or production security assessment.

Run the MongoDB-backed test locally against a local MongoDB server listening on `127.0.0.1:27017` with `cd backend && npm ci && npm run test:integration`. It creates a randomly named **test-only local database** and deletes it after the test. The test does not accept a remote database URI.

## Security and limitations

- **Request boundaries:** POST/PUT/PATCH API calls accept `Content-Type: application/json` only; non-JSON forms return HTTP 415, malformed JSON HTTP 400, and payloads over 32 KiB HTTP 413. The API does not accept URL-encoded nested objects.
- **Browser-origin policy:** local demo origins are explicitly allowlisted. `CORS_ORIGINS` may replace the list with comma-separated exact URL origins; remote origins require HTTPS under `NODE_ENV=production`. Wildcards, URL paths and credentialed origins are rejected at startup. CORS is **not authentication or a substitute for TLS**.
- **Development configuration only:** Compose binds MongoDB to host loopback and requires `JWT_SECRET` to be set. Signing and verification reject known placeholders and keys under 32 characters. API port 5000 is now mapped to loopback only in Compose. Use TLS, trusted proxy configuration, distributed rate limits and explicit network access controls before any external deployment.
- **Prototype scope:** this repository is not a production CMMS, EAM or validated regulated-industry logbook.
- **Authentication hardening:** public registration always provisions an `operator`, not an administrator or supervisor. Any authenticated user can add assets or create log entries; only supervisors and administrators may change asset metadata/status or remove assets, and an asset with logs cannot be deleted (decommission it instead). Operators may edit only their own logs. Privileged role assignment requires a trusted administrative action. Protected endpoints reject inactive accounts. Login/signup use bounded single-process, socket-IP attempt limits for the local demo (30 logins/10 minutes and 10 registrations/10 minutes); these **do not** replace distributed edge quotas. Token storage, formal access reviews and audit retention still need further work.
- **Demo assets:** the public demo's fixture is fictional, and screenshots show project interfaces rather than live equipment integration.

## Repository map

- `backend/src/` — API, persistence and authentication
- `frontend/src/` — user interface and API client
- `docker-compose.yml` — local three-service orchestration
- `docs/` — product screenshots and examples

## License

[MIT](LICENSE)
