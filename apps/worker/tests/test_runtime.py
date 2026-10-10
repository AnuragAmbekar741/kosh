import logging
from uuid import uuid4

import pytest
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlmodel import create_engine
from storage import database
from worker import runtime
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


class _Stop(Exception):
    pass


def _disconnect() -> OperationalError:
    return OperationalError(
        "SELECT documents", {}, Exception("server closed the connection")
    )


def test_lost_connection_backs_off_and_recovers(monkeypatch, caplog) -> None:
    caplog.set_level(logging.INFO, logger="worker.runtime")
    ran: list[str] = []
    outcomes = iter([_disconnect(), _disconnect(), None, _Stop()])

    def claim(_session) -> Claim | None:
        outcome = next(outcomes)
        if isinstance(outcome, BaseException):
            raise outcome
        return None

    sleeps: list[float] = []

    def sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(runtime.time, "sleep", sleep)
    job = Job(name="a", reclaim=lambda _s: 0, claim=claim, run=ran.append)
    with pytest.raises(_Stop):
        runtime.run([job], poll_seconds=2)

    assert sleeps == [4, 8, 2]  # back off twice, then the normal idle poll
    assert caplog.text.count("database unavailable") == 2
    assert "database reachable again" in caplog.text


def test_backoff_is_capped(monkeypatch) -> None:
    failures = iter([_disconnect()] * 8 + [_Stop()])

    def claim(_session) -> Claim | None:
        raise next(failures)

    sleeps: list[float] = []
    monkeypatch.setattr(runtime.time, "sleep", sleeps.append)
    job = Job(name="a", reclaim=lambda _s: 0, claim=claim, run=lambda _c: None)
    with pytest.raises(_Stop):
        runtime.run([job], poll_seconds=2)
    assert max(sleeps) == 60


def test_sql_errors_still_stop_the_worker() -> None:
    def claim(_session) -> Claim | None:
        raise ProgrammingError("SELECT nope", {}, Exception("no such column"))

    job = Job(name="a", reclaim=lambda _s: 0, claim=claim, run=lambda _c: None)
    with pytest.raises(ProgrammingError):
        runtime.run([job], poll_seconds=2)
