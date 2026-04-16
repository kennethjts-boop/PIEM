"""
Tests for /v1/ai-decision endpoints (TDD).
"""
import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_supabase

client = TestClient(app)

USER_ID = str(uuid.uuid4())
FIELD_ID = str(uuid.uuid4())
SCHOOL_YEAR_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())


def override_supabase(mock_client):
    app.dependency_overrides[get_supabase] = lambda: mock_client


def override_supabase_none():
    app.dependency_overrides[get_supabase] = lambda: None


def restore_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. POST /distribute-projects → 200, distribution_plan list, coverage_map, flexibility_indexes
# ---------------------------------------------------------------------------


def test_distribute_projects_returns_200():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": PROJECT_ID,
            "field_id": FIELD_ID,
            "trimester": 1,
            "sequence_number": 1,
            "name": "Proyecto lectura",
            "suggested_days": 10,
            "priority": 1,
            "is_flexible": True,
        }
    ]
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/ai-decision/distribute-projects",
            json={
                "user_id": USER_ID,
                "field_id": FIELD_ID,
                "school_year_id": SCHOOL_YEAR_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "distribution_plan" in data
        assert "coverage_map" in data
        assert "flexibility_indexes" in data
        assert isinstance(data["distribution_plan"], list)
        assert "trimester_1" in data["coverage_map"]
        assert "trimester_2" in data["coverage_map"]
        assert "trimester_3" in data["coverage_map"]
        assert "flexible" in data["flexibility_indexes"]
        assert "fixed" in data["flexibility_indexes"]
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 2. POST /distribute-projects con supabase None → listas vacías
# ---------------------------------------------------------------------------


def test_distribute_projects_supabase_none_returns_empty():
    override_supabase_none()
    try:
        response = client.post(
            "/v1/ai-decision/distribute-projects",
            json={
                "user_id": USER_ID,
                "field_id": FIELD_ID,
                "school_year_id": SCHOOL_YEAR_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["distribution_plan"] == []
        assert data["coverage_map"] == {"trimester_1": 0, "trimester_2": 0, "trimester_3": 0}
        assert data["flexibility_indexes"] == {"flexible": 0, "fixed": 0}
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 3. POST /score-project-priorities → 200, project_scores list, scored_at presente
# ---------------------------------------------------------------------------


def test_score_project_priorities_returns_200():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": PROJECT_ID,
            "field_id": FIELD_ID,
            "trimester": 1,
            "sequence_number": 1,
            "name": "Proyecto A",
            "suggested_days": 8,
            "priority": 2,
            "is_flexible": False,
        }
    ]
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/ai-decision/score-project-priorities",
            json={
                "user_id": USER_ID,
                "field_id": FIELD_ID,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "project_scores" in data
        assert "scored_at" in data
        assert isinstance(data["project_scores"], list)
        assert isinstance(data["scored_at"], str)
        assert len(data["scored_at"]) > 0
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 4. POST /suggest-next-action → 200, suggestion, rationale, confidence (0-1), calendar_impact
# ---------------------------------------------------------------------------


def test_suggest_next_action_returns_200():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": USER_ID,
            "date": "2026-04-14",
            "narrative": "Clase de matemáticas con buenos resultados",
            "participation_level": 4,
        }
    ]
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/ai-decision/suggest-next-action",
            json={
                "user_id": USER_ID,
                "date": "2026-04-15",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestion" in data
        assert "rationale" in data
        assert "confidence" in data
        assert "calendar_impact" in data
        assert isinstance(data["suggestion"], str)
        assert isinstance(data["rationale"], str)
        assert isinstance(data["confidence"], float)
        assert 0.0 <= data["confidence"] <= 1.0
        assert isinstance(data["calendar_impact"], str)
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 5. POST /suggest-next-action con supabase None → respuesta válida con valores default
# ---------------------------------------------------------------------------


def test_suggest_next_action_supabase_none_returns_default():
    override_supabase_none()
    try:
        response = client.post(
            "/v1/ai-decision/suggest-next-action",
            json={
                "user_id": USER_ID,
                "date": "2026-04-15",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestion" in data
        assert "rationale" in data
        assert "confidence" in data
        assert "calendar_impact" in data
        assert isinstance(data["suggestion"], str)
        assert len(data["suggestion"]) > 0
        assert isinstance(data["confidence"], float)
        assert 0.0 <= data["confidence"] <= 1.0
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 6. GET /coverage-report?user_id=...&trimester=1 → 200, todos los campos presentes
# ---------------------------------------------------------------------------


def test_coverage_report_returns_200():
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    override_supabase(mock)
    try:
        response = client.get(
            f"/v1/ai-decision/coverage-report?user_id={USER_ID}&trimester=1"
        )
        assert response.status_code == 200
        data = response.json()
        assert "projects_covered" in data
        assert "pda_addressed" in data
        assert "remaining_days" in data
        assert "risk_level" in data
        assert "recommendations" in data
        assert isinstance(data["projects_covered"], int)
        assert isinstance(data["pda_addressed"], int)
        assert isinstance(data["remaining_days"], int)
        assert data["risk_level"] in ("low", "medium", "high")
        assert isinstance(data["recommendations"], list)
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 7. GET /coverage-report sin user_id → 422
# ---------------------------------------------------------------------------


def test_coverage_report_missing_user_id_returns_422():
    response = client.get("/v1/ai-decision/coverage-report?trimester=1")
    assert response.status_code == 422
