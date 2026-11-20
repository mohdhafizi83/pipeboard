"""FastAPI surface for PipeBoard. Run: uvicorn app.main:app --reload"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import core


@asynccontextmanager
async def lifespan(app: FastAPI):
    core.init_db()
    core.seed_demo()
    runner = None
    if os.environ.get("PIPEBOARD_RUNNER", "1") != "0":
        runner = core.Runner()
        runner.start()
    app.state.runner = runner
    yield
    if runner is not None:
        runner.stop()


app = FastAPI(title="PipeBoard API", version="0.1.0", lifespan=lifespan)
# dev frontend on Angular's default port; no auth in this demo scope (documented)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class JobCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    source: str = Field(min_length=1, max_length=120)
    sink: str = Field(min_length=1, max_length=120)
    schedule: str = Field(default="manual", pattern="^(manual|hourly|daily|nightly|weekly)$")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/jobs")
def jobs() -> list[dict]:
    return core.list_jobs()


@app.post("/api/jobs", status_code=201)
def create_job(body: JobCreate) -> dict:
    try:
        job_id = core.create_job(
            core.JobIn(name=body.name, source=body.source, sink=body.sink, schedule=body.schedule)
        )
    except Exception as exc:  # sqlite UNIQUE etc.
        raise HTTPException(409, f"job not created: {exc}") from exc
    return {"id": job_id, "name": body.name}


@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(job_id: int) -> None:
    if not core.delete_job(job_id):
        raise HTTPException(404, "job not found")


@app.post("/api/jobs/{job_id}/runs", status_code=202)
def trigger_run(job_id: int) -> dict:
    run_id = core.enqueue_run(job_id)
    if run_id is None:
        raise HTTPException(404, "job not found")
    return {"run_id": run_id, "status": "queued"}


@app.get("/api/runs")
def runs(job_id: int | None = None, limit: int = 50) -> list[dict]:
    return core.list_runs(job_id=job_id, limit=min(limit, 200))
