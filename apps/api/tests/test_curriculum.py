import uuid
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.routers.curriculum import get_supabase

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

FIELD_ID = str(uuid.uuid4())
PROJECT_ID = str(uuid.uuid4())
PDA_ID = str(uuid.uuid4())
PARTIAL_ID = str(uuid.uuid4())


def make_supabase_mock():
    """Return a MagicMock that mimics the supabase client chained query API."""
    mock_client = MagicMock()
    return mock_client


def override_supabase(mock_client):
    """Override the FastAPI dependency with the given mock."""
    app.dependency_overrides[get_supabase] = lambda: mock_client
    return mock_client


def restore_overrides():
    app.dependency_overrides.clear()


client = TestClient(app)

# ---------------------------------------------------------------------------
# GET /v1/curriculum/fields
# ---------------------------------------------------------------------------


def test_get_fields_returns_200_with_list():
    mock = make_supabase_mock()
    # Chain: .table().select().execute()
    mock.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": FIELD_ID,
            "name": "Lenguajes",
            "description": "Campo de lenguajes",
            "project_count": 3,
        }
    ]
    override_supabase(mock)
    try:
        response = client.get("/v1/curriculum/fields")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["name"] == "Lenguajes"
        assert data[0]["project_count"] == 3
    finally:
        restore_overrides()


def test_get_fields_returns_empty_list_on_no_data():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.execute.return_value.data = []
    override_supabase(mock)
    try:
        response = client.get("/v1/curriculum/fields")
        assert response.status_code == 200
        assert response.json() == []
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# GET /v1/curriculum/fields/{field_id}/projects
# ---------------------------------------------------------------------------


def test_get_projects_by_field_returns_200():
    mock = make_supabase_mock()
    chain = mock.table.return_value.select.return_value
    chain.eq.return_value.execute.return_value.data = [
        {
            "id": PROJECT_ID,
            "name": "Proyecto A",
            "description": "Desc",
            "trimester": 1,
            "suggested_days": 10,
            "priority": 1,
            "is_flexible": False,
            "pda_count": 2,
        }
    ]
    override_supabase(mock)
    try:
        response = client.get(f"/v1/curriculum/fields/{FIELD_ID}/projects")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert data[0]["name"] == "Proyecto A"
        assert data[0]["pda_count"] == 2
    finally:
        restore_overrides()


def test_get_projects_by_field_with_trimester_filter():
    mock = make_supabase_mock()
    # eq chained twice for field_id + trimester
    eq1 = MagicMock()
    eq2 = MagicMock()
    eq2.execute.return_value.data = [
        {
            "id": PROJECT_ID,
            "name": "Proyecto B",
            "description": None,
            "trimester": 2,
            "suggested_days": 5,
            "priority": 2,
            "is_flexible": True,
            "pda_count": 0,
        }
    ]
    eq1.eq.return_value = eq2
    mock.table.return_value.select.return_value.eq.return_value = eq1
    override_supabase(mock)
    try:
        response = client.get(
            f"/v1/curriculum/fields/{FIELD_ID}/projects?trimester=2"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# GET /v1/curriculum/projects/{project_id}
# ---------------------------------------------------------------------------


def test_get_project_detail_returns_200():
    mock = make_supabase_mock()

    # Project fetch
    mock.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": PROJECT_ID,
        "name": "Proyecto Detalle",
        "description": "Desc detalle",
        "trimester": 1,
        "suggested_days": 10,
        "priority": 1,
        "is_flexible": False,
    }

    override_supabase(mock)
    try:
        response = client.get(f"/v1/curriculum/projects/{PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Proyecto Detalle"
        assert "partial_projects" in data
        assert "pdas" in data
        assert "dependencies" in data
        assert isinstance(data["partial_projects"], list)
        assert isinstance(data["pdas"], list)
        assert isinstance(data["dependencies"], list)
    finally:
        restore_overrides()


def test_get_project_detail_not_found():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None
    override_supabase(mock)
    try:
        response = client.get(f"/v1/curriculum/projects/{PROJECT_ID}")
        assert response.status_code == 404
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# GET /v1/curriculum/pda
# ---------------------------------------------------------------------------


def test_get_pda_returns_200():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": PDA_ID,
            "code": "LL-1-1",
            "description": "Comprensión lectora",
            "level": 1,
        }
    ]
    override_supabase(mock)
    try:
        response = client.get("/v1/curriculum/pda")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert data[0]["code"] == "LL-1-1"
    finally:
        restore_overrides()


def test_get_pda_with_search_filter():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = [
        {
            "id": PDA_ID,
            "code": "LL-1-2",
            "description": "Comprensión de textos narrativos",
            "level": 1,
        }
    ]
    override_supabase(mock)
    try:
        response = client.get("/v1/curriculum/pda?search=comprension")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    finally:
        restore_overrides()


def test_get_pda_with_field_filter():
    mock = make_supabase_mock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {
            "id": PDA_ID,
            "code": "MAT-1-1",
            "description": "Operaciones básicas",
            "level": 2,
        }
    ]
    override_supabase(mock)
    try:
        response = client.get("/v1/curriculum/pda?field=matematicas")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    finally:
        restore_overrides()
