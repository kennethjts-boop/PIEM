import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_supabase

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

USER_ID = str(uuid.uuid4())
SCHOOL_YEAR_ID = str(uuid.uuid4())
FIELD_ID = str(uuid.uuid4())
CALENDAR_ID = str(uuid.uuid4())
ENTRY_ID = str(uuid.uuid4())
ADJUSTMENT_ID = str(uuid.uuid4())
CODESIGN_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())


def make_supabase_mock():
    """Return a MagicMock that mimics the supabase client chained query API."""
    return MagicMock()


def override_supabase(mock_client):
    app.dependency_overrides[get_supabase] = lambda: mock_client
    return mock_client


def restore_overrides():
    app.dependency_overrides.clear()


client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. POST /v1/calendar/generate → 201 con calendar_id, total_entries, distribution_summary
# ---------------------------------------------------------------------------


def test_generate_calendar_returns_201():
    mock = make_supabase_mock()

    # academic_projects query
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": PROJECT_ID,
            "field_id": FIELD_ID,
            "trimester": 1,
            "sequence_number": 1,
            "name": "Proyecto A",
            "suggested_days": 5,
            "priority": 1,
            "is_flexible": False,
        }
    ]

    # teacher_calendar insert
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": CALENDAR_ID}
    ]

    override_supabase(mock)
    try:
        response = client.post(
            "/v1/calendar/generate",
            json={
                "user_id": USER_ID,
                "school_year_id": SCHOOL_YEAR_ID,
                "field_id": FIELD_ID,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "calendar_id" in data
        assert "total_entries" in data
        assert "distribution_summary" in data
        assert "by_trimester" in data["distribution_summary"]
        assert "total_projects" in data["distribution_summary"]
    finally:
        restore_overrides()


def test_generate_calendar_no_supabase_returns_201():
    """When supabase is None, still returns a valid 201 with dummy data."""
    app.dependency_overrides[get_supabase] = lambda: None
    try:
        response = client.post(
            "/v1/calendar/generate",
            json={
                "user_id": USER_ID,
                "school_year_id": SCHOOL_YEAR_ID,
                "field_id": FIELD_ID,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "calendar_id" in data
        assert data["total_entries"] == 0
        assert "distribution_summary" in data
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 2. GET /v1/calendar/month → 200 con year, month, days list
# ---------------------------------------------------------------------------


def test_get_month_returns_200():
    mock = make_supabase_mock()

    # calendar query chain: table().select().eq().eq().gte().lte().execute()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.gte.return_value.lte.return_value.execute.return_value.data = [
        {
            "id": ENTRY_ID,
            "teacher_calendar_id": CALENDAR_ID,
            "date": "2025-09-01",
            "entry_type": "academic_project",
            "academic_project_id": PROJECT_ID,
            "codesign_id": None,
            "status": "planned",
            "notes": None,
        }
    ]

    override_supabase(mock)
    try:
        response = client.get(
            f"/v1/calendar/month?user_id={USER_ID}&year=2025&month=9"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2025
        assert data["month"] == 9
        assert isinstance(data["days"], list)
    finally:
        restore_overrides()


def test_get_month_no_supabase_returns_200():
    app.dependency_overrides[get_supabase] = lambda: None
    try:
        response = client.get(
            f"/v1/calendar/month?user_id={USER_ID}&year=2025&month=9"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2025
        assert data["month"] == 9
        assert isinstance(data["days"], list)
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 3. GET /v1/calendar/day/2025-09-01 → 200 con date, entries list
# ---------------------------------------------------------------------------


def test_get_day_returns_200():
    mock = make_supabase_mock()

    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": ENTRY_ID,
            "teacher_calendar_id": CALENDAR_ID,
            "date": "2025-09-01",
            "entry_type": "academic_project",
            "academic_project_id": PROJECT_ID,
            "codesign_id": None,
            "status": "planned",
            "notes": None,
        }
    ]

    override_supabase(mock)
    try:
        response = client.get(f"/v1/calendar/day/2025-09-01?user_id={USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == "2025-09-01"
        assert "entries" in data
        assert isinstance(data["entries"], list)
        assert "total_entries" in data
    finally:
        restore_overrides()


def test_get_day_no_supabase_returns_200():
    app.dependency_overrides[get_supabase] = lambda: None
    try:
        response = client.get(f"/v1/calendar/day/2025-09-01?user_id={USER_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == "2025-09-01"
        assert isinstance(data["entries"], list)
        assert data["total_entries"] == 0
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 4. POST /v1/calendar/day/mark-unavailable → 200 con exactamente 3 opciones
# ---------------------------------------------------------------------------


def test_mark_unavailable_returns_3_options():
    """Always returns exactly 3 options: shift, compress, drop."""
    response = client.post(
        "/v1/calendar/day/mark-unavailable",
        json={
            "user_id": USER_ID,
            "date": "2025-09-15",
            "reason": "Visita médica",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "options" in data
    options = data["options"]
    assert len(options) == 3

    types = {opt["type"] for opt in options}
    assert types == {"shift", "compress", "drop"}

    for opt in options:
        assert "impact" in opt
        assert "preview" in opt


def test_mark_unavailable_no_supabase_still_returns_3_options():
    """mark-unavailable never queries supabase, always deterministic."""
    app.dependency_overrides[get_supabase] = lambda: None
    try:
        response = client.post(
            "/v1/calendar/day/mark-unavailable",
            json={
                "user_id": USER_ID,
                "date": "2025-10-01",
                "reason": "Capacitación docente",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["options"]) == 3
        types = {opt["type"] for opt in data["options"]}
        assert types == {"shift", "compress", "drop"}
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 5. POST /v1/calendar/day/apply-adjustment → 201 con adjustment_id y adjusted_entries
# ---------------------------------------------------------------------------


def test_apply_adjustment_returns_201():
    mock = make_supabase_mock()

    # insert into calendar_adjustments
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": ADJUSTMENT_ID}
    ]

    override_supabase(mock)
    try:
        response = client.post(
            "/v1/calendar/day/apply-adjustment",
            json={
                "user_id": USER_ID,
                "adjustment_option": {
                    "type": "shift",
                    "date": "2025-09-15",
                    "reason": "Visita médica",
                },
                "confirmed_by": "teacher",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "adjustment_id" in data
        assert "adjusted_entries" in data
        assert "impact_summary" in data
        assert "coverage_risk" in data
    finally:
        restore_overrides()


def test_apply_adjustment_drop_cancels_entries():
    mock = make_supabase_mock()

    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": ADJUSTMENT_ID}
    ]

    override_supabase(mock)
    try:
        response = client.post(
            "/v1/calendar/day/apply-adjustment",
            json={
                "user_id": USER_ID,
                "adjustment_option": {
                    "type": "drop",
                    "date": "2025-09-15",
                    "reason": "Emergencia",
                },
                "confirmed_by": "teacher",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "adjustment_id" in data
        assert "adjusted_entries" in data
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 6. POST /v1/calendar/insert-codesign → 201 con inserted_entry_id
# ---------------------------------------------------------------------------


def test_insert_codesign_returns_201():
    mock = make_supabase_mock()

    mock.table.return_value.insert.return_value.execute.return_value.data = [
        {
            "id": ENTRY_ID,
            "date": "2025-09-20",
            "codesign_id": CODESIGN_ID,
        }
    ]

    override_supabase(mock)
    try:
        response = client.post(
            "/v1/calendar/insert-codesign",
            json={
                "user_id": USER_ID,
                "date": "2025-09-20",
                "codesign_id": CODESIGN_ID,
                "duration_days": 2,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "inserted_entry_id" in data
        assert "date" in data
        assert "codesign_id" in data
        assert "duration_days" in data
    finally:
        restore_overrides()


def test_insert_codesign_no_supabase_returns_201():
    app.dependency_overrides[get_supabase] = lambda: None
    try:
        response = client.post(
            "/v1/calendar/insert-codesign",
            json={
                "user_id": USER_ID,
                "date": "2025-09-20",
                "codesign_id": CODESIGN_ID,
                "duration_days": 3,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "inserted_entry_id" in data
        assert data["duration_days"] == 3
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 7. POST /v1/calendar/recalculate → 200 con status "recalculation_queued"
# ---------------------------------------------------------------------------


def test_recalculate_returns_200_queued():
    response = client.post(
        "/v1/calendar/recalculate",
        json={
            "user_id": USER_ID,
            "trigger_type": "manual",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recalculation_queued"
    assert "trigger_type" in data
    assert "user_id" in data
    assert "queued_at" in data


# ---------------------------------------------------------------------------
# 8. POST /recalculate con trigger_type="bitacora" → response.trigger_type == "bitacora"
# ---------------------------------------------------------------------------


def test_recalculate_trigger_type_bitacora():
    response = client.post(
        "/v1/calendar/recalculate",
        json={
            "user_id": USER_ID,
            "trigger_type": "bitacora",
            "context_delta": "Sesión completada al 80%",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["trigger_type"] == "bitacora"
    assert data["status"] == "recalculation_queued"
