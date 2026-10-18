# PlantLog public demo

The public `/demo` route is an **entirely read-only** presentation of the industrial logbook. It uses static, fictional records bundled with the frontend. It does **not** call the API, issue JWTs, seed MongoDB, or connect to real industrial equipment.

## Quick review (no credentials, database, or backend)

```bash
cd frontend
npm ci
npm run test:demo
npm run build
npm run dev
```

Open `http://localhost:5173/demo`. The browser route is also accessible from the login screen via **Explore demo**.

## Demonstration walk-through

1. In **Overview**, inspect totals calculated from the example asset and log records, alongside recent events.
2. In **Asset registry**, search for equipment by name, serial, category or location; filter by status.
3. Select **View logs** on a particular asset to see its associated records.
4. In **Maintenance log**, search for a title, description, status or asset; filter by event type and remove the per-asset filter.
5. Reload the page. No data can be edited, and no example records are persisted.

## Sample data and validation

- Static fixture: `frontend/src/demo/fixture.json`.
- Data integrity checks: `frontend/tests/demo-data.test.cjs`, executed with `npm run test:demo`.
- Test constraints cover unique IDs, references, status/type enums, valid dates and a non-live data disclaimer.
- The real application still requires Express and MongoDB, and its authenticated routes remain separate.

## Static hosting

Deploy **only** the `frontend/` directory to a static host if demonstrating `/demo` without the API. Use the root directory `frontend`, build command `npm ci && npm run build`, and output directory `dist`. Configure your host's SPA fallback so `/demo` serves `index.html`. Other authenticated application views will not be functional without their own backend.

**This route is a portfolio example, not a validated CMMS, safety system, digital twin or live telemetry source.**
