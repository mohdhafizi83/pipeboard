"""PipeBoard backend: a small pipeline-job registry with a simulated runner.

The app models a realistic slice of an ETL deployment console:
- jobs (source -> transform -> sink) with cron-ish schedules and enabled flag
- runs with queued/running/success/failed states and log lines
- a background runner thread that picks queued runs and "executes" them
  deterministically (seeded by job id + attempt) so demos and tests are stable.

No external services are required: SQLite via stdlib sqlite3, stdlib threading.
"""
from __future__ import annotations

import hashlib
import os
import random
import sqlite3
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

DB_PATH = Path(os.environ.get("PIPEBOARD_DB") or Path(__file__).resolve().parent.parent / "pipeboard.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    sink TEXT NOT NULL,
    schedule TEXT NOT NULL DEFAULT 'manual',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued','running','success','failed')),
    started_at TEXT,
    finished_at TEXT,
    rows_moved INTEGER NOT NULL DEFAULT 0,
    log TEXT NOT NULL DEFAULT ''
);
"""


@contextmanager
def connect(path: Path | str | None = None) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(path or DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(path: Path | str | None = None) -> None:
    with connect(path) as conn:
        conn.executescript(SCHEMA)


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


# ---------------------------------------------------------------- jobs
@dataclass
class JobIn:
    name: str
    source: str
    sink: str
    schedule: str = "manual"
    enabled: bool = True


def create_job(job: JobIn, path: Path | str | None = None) -> int:
    with connect(path) as conn:
        cur = conn.execute(
            "INSERT INTO jobs (name, source, sink, schedule, enabled, created_at)"
            " VALUES (?,?,?,?,?,?)",
            (job.name, job.source, job.sink, job.schedule, int(job.enabled), now_iso()),
        )
        return int(cur.lastrowid)


def list_jobs(path: Path | str | None = None) -> list[dict]:
    with connect(path) as conn:
        rows = conn.execute("SELECT * FROM jobs ORDER BY id").fetchall()
    return [dict(r) for r in rows]


def get_job(job_id: int, path: Path | str | None = None) -> dict | None:
    with connect(path) as conn:
        row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
    return dict(row) if row else None


def delete_job(job_id: int, path: Path | str | None = None) -> bool:
    with connect(path) as conn:
        cur = conn.execute("DELETE FROM jobs WHERE id=?", (job_id,))
        return cur.rowcount > 0


# ---------------------------------------------------------------- runs
def enqueue_run(job_id: int, path: Path | str | None = None) -> int | None:
    if get_job(job_id, path) is None:
        return None
    with connect(path) as conn:
        cur = conn.execute(
            "INSERT INTO runs (job_id, status, started_at) VALUES (?,?,?)",
            (job_id, "queued", now_iso()),
        )
        return int(cur.lastrowid)


def list_runs(job_id: int | None = None, limit: int = 50, path: Path | str | None = None) -> list[dict]:
    with connect(path) as conn:
        if job_id is None:
            rows = conn.execute(
                "SELECT r.*, j.name AS job_name FROM runs r JOIN jobs j ON j.id=r.job_id"
                " ORDER BY r.id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT r.*, j.name AS job_name FROM runs r JOIN jobs j ON j.id=r.job_id"
                " WHERE r.job_id=? ORDER BY r.id DESC LIMIT ?",
                (job_id, limit),
            ).fetchall()
    return [dict(r) for r in rows]


def simulate_outcome(job_id: int, run_id: int) -> tuple[str, int]:
    """Deterministic pseudo-outcome so demos/tests are reproducible.

    ~1 in 5 runs fail; rows_moved is stable per (job, run).
    """
    digest = hashlib.sha256(f"{job_id}:{run_id}".encode()).hexdigest()
    rng = random.Random(int(digest[:12], 16))
    fail = rng.random() < 0.2
    rows = 0 if fail else rng.randint(50, 5000)
    return ("failed" if fail else "success"), rows


class Runner(threading.Thread):
    """Background worker that drains queued runs. Pure stdlib, no scheduler deps."""

    def __init__(self, poll_seconds: float = 0.5, db_path: Path | str | None = None):
        super().__init__(daemon=True)
        self.poll_seconds = poll_seconds
        self.db_path = db_path
        self._stop = threading.Event()

    def run(self) -> None:
        while not self._stop.is_set():
            try:
                self.drain_once()
            except sqlite3.Error:
                # transient DB trouble (file swapped mid-dev) must not kill the runner
                pass
            self._stop.wait(self.poll_seconds)

    def stop(self) -> None:
        self._stop.set()

    def drain_once(self) -> int:
        """Process every currently-queued run once. Returns count processed."""
        with connect(self.db_path) as conn:
            queued = conn.execute(
                "SELECT id, job_id FROM runs WHERE status='queued' ORDER BY id"
            ).fetchall()
        for row in queued:
            self._execute(row["id"], row["job_id"])
        return len(queued)

    def _execute(self, run_id: int, job_id: int) -> None:
        status, rows = simulate_outcome(job_id, run_id)
        log = (
            f"[{now_iso()}] connecting to source...\n"
            f"[{now_iso()}] extracted batch\n"
            f"[{now_iso()}] applying transform\n"
            f"[{now_iso()}] writing sink: {rows} rows\n"
            f"[{now_iso()}] run {status}"
        )
        with connect(self.db_path) as conn:
            conn.execute(
                "UPDATE runs SET status=?, finished_at=?, rows_moved=?, log=?"
                " WHERE id=? AND status='queued'",
                (status, now_iso(), rows, log, run_id),
            )


def seed_demo(path: Path | str | None = None) -> None:
    """Idempotent demo seed: three pipelines resembling a data-lake ingestion."""
    if list_jobs(path):
        return
    for name, src, sink, sched in [
        ("orders-mysql-to-warehouse", "mysql:orders", "snowflake:raw.orders", "hourly"),
        ("clickstream-s3-to-lake", "s3:clickstream/*.parquet", "datalake:events", "daily"),
        ("crm-sync-nightly", "rest:crm/v2/contacts", "postgres:crm.contacts", "nightly"),
    ]:
        create_job(JobIn(name=name, source=src, sink=sink, schedule=sched), path)
        enqueue_run(1 if name.startswith("orders") else 2, path)
