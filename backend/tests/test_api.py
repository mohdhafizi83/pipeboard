"""Backend tests: API contract + runner determinism. No network, tmp SQLite."""
import os

os.environ["PIPEBOARD_RUNNER"] = "0"  # keep runs 'queued' for deterministic assertions

import pytest
from fastapi.testclient import TestClient

from app import core
from app.main import app


@pytest.fixture()
def db(tmp_path):
    path = tmp_path / "test.db"
    core.DB_PATH = path  # module-level default used by endpoints
    core.init_db(path)
    yield path


@pytest.fixture()
def client(db):
    # avoid the background runner mutating state mid-test
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_create_and_list_jobs(client):
    r = client.post("/api/jobs", json={
        "name": "sales-daily", "source": "mysql:sales", "sink": "snowflake:raw.sales",
        "schedule": "daily"})
    assert r.status_code == 201
    jobs = client.get("/api/jobs").json()
    assert any(j["name"] == "sales-daily" for j in jobs)


def test_duplicate_job_name_rejected(client):
    payload = {"name": "dup", "source": "a", "sink": "b"}
    assert client.post("/api/jobs", json=payload).status_code == 201
    assert client.post("/api/jobs", json=payload).status_code == 409


def test_invalid_schedule_rejected(client):
    r = client.post("/api/jobs", json={
        "name": "bad-sched", "source": "a", "sink": "b", "schedule": "every-minute"})
    assert r.status_code == 422


def test_trigger_run_and_history(client):
    jid = client.post("/api/jobs", json={"name": "j1", "source": "s", "sink": "k"}).json()["id"]
    r = client.post(f"/api/jobs/{jid}/runs")
    assert r.status_code == 202
    runs = client.get("/api/runs", params={"job_id": jid}).json()
    assert len(runs) == 1 and runs[0]["status"] == "queued"


def test_trigger_run_unknown_job(client):
    assert client.post("/api/jobs/999/runs").status_code == 404


def test_delete_job(client):
    jid = client.post("/api/jobs", json={"name": "del", "source": "s", "sink": "k"}).json()["id"]
    assert client.delete(f"/api/jobs/{jid}").status_code == 204
    assert client.delete(f"/api/jobs/{jid}").status_code == 404


def test_runner_processes_queued_runs(db):
    jid = core.create_job(core.JobIn(name="r", source="s", sink="k"), db)
    core.enqueue_run(jid, db)
    runner = core.Runner(db_path=db)
    processed = runner.drain_once()
    assert processed == 1
    runs = core.list_runs(job_id=jid, path=db)
    assert runs[0]["status"] in ("success", "failed")
    assert runs[0]["finished_at"] is not None
    assert "run " in runs[0]["log"]
    # idempotent: a second drain does not re-process a finished run
    assert runner.drain_once() == 0


def test_outcome_is_deterministic():
    a = core.simulate_outcome(3, 7)
    b = core.simulate_outcome(3, 7)
    assert a == b
    assert a[0] in ("success", "failed")


def test_seed_demo_is_idempotent(db):
    core.seed_demo(db)
    first = core.list_jobs(db)
    core.seed_demo(db)
    assert len(core.list_jobs(db)) == len(first) == 3
