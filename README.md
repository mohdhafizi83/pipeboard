# PipeBoard

A pipeline job registry & run console — a small full-stack app in the shape of an
ETL deployment console. Register data pipelines (source → sink), trigger runs,
and watch a background runner execute them with logs and row counts.

Built to demonstrate **Python (FastAPI)** + **Angular** working together end to
end: typed HTTP boundary, reactive signals on the frontend, a threaded runner on
the backend, and tests on both sides.

## Stack

| Layer    | Tech                                                        |
|----------|-------------------------------------------------------------|
| Frontend | Angular 20 (standalone components, signals, reactive forms, OnPush) |
| Backend  | Python 3.12, FastAPI, Pydantic, stdlib `sqlite3` + `threading` |
| Tests    | pytest + TestClient (backend), Karma/Jasmine (frontend)      |
| CI       | GitHub Actions: lint + pytest + ng test + production build   |

No external services: SQLite and a stdlib runner thread only.

## Architecture

```
Angular (signals, HttpClient)          FastAPI                     SQLite
┌──────────────────────────┐   JSON   ┌──────────────────┐  SQL   ┌──────────┐
│ JobForm  JobList RunList │ ───────► │ /api/jobs        │ ─────► │ jobs     │
│ ApiService (typed)       │          │ /api/jobs/{}/runs│        │ runs     │
│ 5s poll + offline banner │ ◄─────── │ Runner thread    │        └──────────┘
└──────────────────────────┘          └──────────────────┘
```

- `backend/app/core.py` — schema, CRUD, deterministic simulated runner
  (seeded by job id, so demos and tests are stable; some runs fail on purpose).
- `backend/app/main.py` — FastAPI routes + lifespan-managed runner thread.
- `src/app/api/api.service.ts` — single typed HTTP boundary for the UI.
- `src/app/{job-form,job-list,run-list}` — standalone components with
  signal inputs / outputs, OnPush change detection.

## Run locally

Backend (port 8000):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
PIPEBOARD_DB=/tmp/pipeboard.db .venv/bin/uvicorn app.main:app --port 8000
```

Frontend (port 4200):

```bash
npm install
npx ng serve
```

Open http://localhost:4200 — three demo pipelines are seeded on first start.

## Tests

```bash
# backend: 10 tests (API contract + runner determinism)
cd backend && .venv/bin/python -m pytest -q

# frontend: 14 tests (service contract, form validation, list rendering, app wiring)
CHROME_BIN=/usr/bin/google-chrome npx ng test --watch=false --browsers=ChromeHeadless
```

## API

| Method | Path                  | Purpose                          |
|--------|-----------------------|----------------------------------|
| GET    | `/api/jobs`           | list pipelines                   |
| POST   | `/api/jobs`           | register pipeline                |
| DELETE | `/api/jobs/{id}`      | remove pipeline                  |
| POST   | `/api/jobs/{id}/runs` | trigger a run (queued → result)  |
| GET    | `/api/runs?job_id=`   | run history with logs/row counts |

Demo scope: no auth (documented deliberately); CORS limited to the dev origin.

## Development server (Angular CLI notes)

This project was generated with Angular CLI 20. `ng serve` hot-reloads on
source changes; `ng build` outputs optimized bundles to `dist/`.
