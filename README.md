# VentPulse

## API

The API runs as a regular Node server or a Vercel function (`api/index.js`).
Production deployments use PostgreSQL through `DATABASE_URL`; local development
falls back to Node's built-in `node:sqlite` (Node 22.5+).

```bash
npm run server       # production-style API
npm run dev:api      # API with Node watch mode
npm run test:api     # smoke test (start the API first)
```

The API listens on `PORT` (default `8787`) and stores SQLite data at
`VENTPULSE_DB` (default `./data/ventpulse.sqlite`). Set `VENTPULSE_SECRET` to
replace the local token-signing secret. Demo login credentials are
`demo@ventpulse.local` / `demo`.

### Vercel deployment

Set these Vercel environment variables for the serverless API:

```bash
DATABASE_URL=postgres://...
VENTPULSE_SECRET=<at least 32 random characters>
CORS_ORIGIN=https://your-frontend.vercel.app
VITE_API_URL=/api
```

The schema in `migrations/001_initial.sql` is applied idempotently on cold
start. Vercel's filesystem is ephemeral, so SQLite is intentionally only a
local fallback and must not be used for production data.

`GET /health` is unauthenticated and reports the selected database driver.
Errors use a stable `{ "error": { "code", "message" } }` envelope; validation
errors additionally include `fields`.

### Core intelligence endpoint

`POST /api/intelligence/analyze` accepts the required `telemetry_payload` schema
and an optional `history` array of prior validated payloads. It returns
`422` with field-level validation errors for malformed telemetry. It returns
`ventpulse_alert` only when an intersecting signature reaches the 0.75 confidence
threshold; isolated spikes do not trigger an alert.

Example request:

```json
{
  "telemetry_payload": {
    "asset_id": "CHLR-01",
    "timestamp": "2026-09-27T13:35:00+05:30",
    "vibration_ips": 2.1,
    "pressure_drop_wg": 0.42,
    "phase_imbalance_pct": 0.8,
    "motor_temp_c": 47,
    "power_draw_kw": 118
  },
  "history": []
}
```

## Frontend

```bash
npm run dev
```

For local development, start the API and frontend together with:

```bash
npm start
```

The Vite app uses `VITE_API_URL` for the API base URL. The dashboard intentionally
falls back to its seeded demo view when an authenticated API session cannot hydrate
portfolio data, but sign-in, property creation, telemetry ingestion, and work-order
creation require the API.

## Deployment boundary

`Dockerfile` packages the API service and persistent SQLite volume. Deploy the Vite
frontend as a static application and set `VITE_API_URL` to the API origin. The
included audit log, signed sessions, and CORS headers are an MVP security baseline;
SOC 2 Type II certification still requires organization-level controls, managed
secrets, centralized logging, backups, incident response, and an independent audit.

## Software-first prototype

The dashboard is hardware-optional. Its connection strip models the first
deployment motion: connect existing BMS/BAS, BACnet/IP, Modbus, utility, weather,
and CMMS data sources, then let VentPulse build a software baseline before
recommending any new sensors. Connector toggles are prototype state controls; the
API adapters and telemetry endpoint provide the integration seam for real
credentials and point mappings.
