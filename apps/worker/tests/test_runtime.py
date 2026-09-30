from uuid import uuid4

import pytest
from sqlmodel import create_engine
from storage import database
from worker.runtime import Claim, Job, run_once


@pytest.fixture(autouse=True)
def _sqlite_engine(monkeypatch) -> None:
    monkeypatch.setattr(database, "engine", create_engine("sqlite://"))


def _job(name: str, claims: list[Claim], ran: list[str], *, crash=False) -> Job:
    def claim(_session) -> Claim | None:
        return claims.pop(0) if claims else None

    def run(_claim: Claim) -> None:
        ran.append(name)
        if crash:
            raise RuntimeError("boom")

    return Job(name=name, reclaim=lambda _session: 0, claim=claim, run=run)


def _claim() -> Claim:
    return Claim(uuid4(), uuid4())


def test_idle_jobs_report_no_work() -> None:
    ran: list[str] = []
    assert run_once([_job("a", [], ran), _job("b", [], ran)]) is False
    assert ran == []


def test_first_job_with_work_wins_each_round() -> None:
    ran: list[str] = []
    jobs = [_job("a", [_claim()], ran), _job("b", [_claim(), _claim()], ran)]
    assert run_once(jobs) is True
    assert run_once(jobs) is True
    assert run_once(jobs) is True
    assert run_once(jobs) is False
    assert ran == ["a", "b", "b"]


def test_crash_is_logged_and_the_loop_continues(caplog) -> None:
    ran: list[str] = []
    claim = _claim()
    jobs = [_job("a", [claim], ran, crash=True), _job("b", [_claim()], ran)]
    assert run_once(jobs) is True
    assert "job crashed" in caplog.text
    assert run_once(jobs) is True
    assert ran == ["a", "b"]
