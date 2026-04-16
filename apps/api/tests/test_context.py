import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_supabase

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

USER_ID = str(uuid.uuid4())
LOG_ID = str(uuid.uuid4())
RECORD_ID = str(uuid.uuid4())
STUDENT_ID = str(uuid.uuid4())


def make_supabase_mock():
    return MagicMock()


def override_supabase(mock_client):
    app.dependency_overrides[get_supabase] = lambda: mock_client
    return mock_client


def restore_overrides():
    app.dependency_overrides.clear()


client = TestClient(app)

# ---------------------------------------------------------------------------
# POST /v1/context/daily-log
# ---------------------------------------------------------------------------


def test_post_daily_log_returns_201():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": LOG_ID, "date": "2026-04-15", "user_id": USER_ID}
    ]
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "narrative": "Clase muy productiva",
            "advances": "Terminamos la unidad",
            "difficulties": "Ninguna",
            "participation_level": 4,
            "behavior_notes": "Buen comportamiento",
            "group_needs": "Más práctica de lectura",
            "ideas_for_tomorrow": "Actividad de escritura creativa",
        }
        response = client.post("/v1/context/daily-log", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "log_id" in data
        assert "date" in data
        assert "user_id" in data
    finally:
        restore_overrides()


def test_post_daily_log_minimal_payload():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": LOG_ID, "date": "2026-04-15", "user_id": USER_ID}
    ]
    override_supabase(mock)
    try:
        payload = {"user_id": USER_ID, "date": "2026-04-15"}
        response = client.post("/v1/context/daily-log", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "log_id" in data
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# POST /v1/context/attendance
# ---------------------------------------------------------------------------


def test_post_attendance_returns_201_with_attendance_rate():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": RECORD_ID, "date": "2026-04-15", "user_id": USER_ID}
    ]
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "total_students": 20,
            "present": 18,
            "absent_ids": [str(uuid.uuid4()), str(uuid.uuid4())],
        }
        response = client.post("/v1/context/attendance", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "record_id" in data
        assert "date" in data
        assert "attendance_rate" in data
        assert abs(data["attendance_rate"] - 0.9) < 0.001
    finally:
        restore_overrides()


def test_post_attendance_zero_present_returns_zero_rate():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": RECORD_ID, "date": "2026-04-15", "user_id": USER_ID}
    ]
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "total_students": 20,
            "present": 0,
            "absent_ids": [],
        }
        response = client.post("/v1/context/attendance", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["attendance_rate"] == 0.0
    finally:
        restore_overrides()


def test_post_attendance_full_attendance():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": RECORD_ID, "date": "2026-04-15", "user_id": USER_ID}
    ]
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "total_students": 25,
            "present": 25,
            "absent_ids": [],
        }
        response = client.post("/v1/context/attendance", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["attendance_rate"] == 1.0
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# POST /v1/context/evaluation
# ---------------------------------------------------------------------------


def test_post_evaluation_returns_201_with_saved_count():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": str(uuid.uuid4())},
        {"id": str(uuid.uuid4())},
    ]
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "evaluations": [
                {
                    "student_id": str(uuid.uuid4()),
                    "criteria": "Comprensión lectora",
                    "score": 8.5,
                    "observation": "Buen desempeño",
                },
                {
                    "student_id": str(uuid.uuid4()),
                    "criteria": "Escritura",
                    "score": 7.0,
                    "observation": None,
                },
            ],
        }
        response = client.post("/v1/context/evaluation", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "saved_count" in data
        assert "date" in data
        assert data["saved_count"] == 2
    finally:
        restore_overrides()


def test_post_evaluation_empty_list():
    mock = make_supabase_mock()
    mock.table.return_value.insert.return_value.execute.return_value.data = []
    override_supabase(mock)
    try:
        payload = {
            "user_id": USER_ID,
            "date": "2026-04-15",
            "evaluations": [],
        }
        response = client.post("/v1/context/evaluation", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["saved_count"] == 0
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# GET /v1/context/summary
# ---------------------------------------------------------------------------


def test_get_summary_returns_200():
    mock = make_supabase_mock()
    # logs query
    mock.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = [
        {"participation_level": 4},
        {"participation_level": 5},
        {"participation_level": 3},
    ]
    override_supabase(mock)
    try:
        response = client.get(
            f"/v1/context/summary?user_id={USER_ID}&from=2026-04-01&to=2026-04-15"
        )
        assert response.status_code == 200
        data = response.json()
        assert "progress_rate" in data
        assert "active_alerts" in data
        assert "top_interests" in data
        assert "period" in data
        assert isinstance(data["progress_rate"], float)
        assert isinstance(data["active_alerts"], int)
        assert isinstance(data["top_interests"], list)
        assert "from" in data["period"]
        assert "to" in data["period"]
    finally:
        restore_overrides()


def test_get_summary_missing_user_id_returns_422():
    response = client.get("/v1/context/summary")
    assert response.status_code == 422


def test_get_summary_without_date_range():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    override_supabase(mock)
    try:
        response = client.get(f"/v1/context/summary?user_id={USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "progress_rate" in data
    finally:
        restore_overrides()


def test_get_summary_null_participation_level_not_counted_as_alert(mock_supabase=None):
    """Logs with None participation_level should not be counted as active alerts."""
    mock = make_supabase_mock()
    mock_data = [
        {"participation_level": None},
        {"participation_level": None},
        {"participation_level": 1},   # this one should count (<=2)
    ]
    mock.table.return_value.select.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = mock_data
    override_supabase(mock)
    try:
        import uuid
        response = client.get(f"/v1/context/summary?user_id={uuid.uuid4()}&from=2026-04-01&to=2026-04-15")
        assert response.status_code == 200
        data = response.json()
        assert data["active_alerts"] == 1  # only the log with level=1
    finally:
        restore_overrides()
