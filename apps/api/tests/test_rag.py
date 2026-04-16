"""
Tests for /v1/rag endpoints (TDD).
"""
import uuid
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_supabase

client = TestClient(app)

USER_ID = str(uuid.uuid4())
CHUNK_ID = str(uuid.uuid4())
FIELD_ID = str(uuid.uuid4())


def override_supabase(mock_client):
    app.dependency_overrides[get_supabase] = lambda: mock_client


def override_supabase_none():
    app.dependency_overrides[get_supabase] = lambda: None


def restore_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. POST /v1/rag/query → 200, chunks list, used_context presente
# ---------------------------------------------------------------------------


def test_rag_query_returns_200_with_chunks():
    mock = MagicMock()
    # Simulate DB returning chunk rows
    mock.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": CHUNK_ID,
            "content": "Fragmento pedagógico sobre lectura",
            "document_id": str(uuid.uuid4()),
            "page_number": 3,
            "section_title": "Capítulo 1",
            "metadata": {"source": "libro_lenguajes"},
        }
    ]
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/rag/query",
            json={
                "user_id": USER_ID,
                "query": "estrategias de lectura",
                "filters": {},
                "top_k": 5,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "chunks" in data
        assert isinstance(data["chunks"], list)
        assert "used_context" in data
        assert "query" in data
        assert data["query"] == "estrategias de lectura"
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 2. POST /v1/rag/query con supabase None → chunks vacío, used_context="no_context"
# ---------------------------------------------------------------------------


def test_rag_query_supabase_none_returns_empty():
    override_supabase_none()
    try:
        response = client.post(
            "/v1/rag/query",
            json={
                "user_id": USER_ID,
                "query": "matemáticas",
                "filters": {},
                "top_k": 3,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["chunks"] == []
        assert data["used_context"] == "no_context"
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 3. POST /v1/rag/suggest-codesign → 200, codesign_proposal con todos los campos
# ---------------------------------------------------------------------------


def test_rag_suggest_codesign_returns_proposal():
    mock = MagicMock()
    mock.table.return_value.select.return_value.execute.return_value.data = []
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/rag/suggest-codesign",
            json={
                "user_id": USER_ID,
                "trigger": "día de muertos",
                "trigger_description": "Festividad local relevante para el contexto cultural",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "codesign_proposal" in data
        proposal = data["codesign_proposal"]
        assert "name" in proposal
        assert "pda_justification" in proposal
        assert "suggested_days" in proposal
        assert "related_chunks" in proposal
        assert "calendar_impact" in proposal
        assert isinstance(proposal["related_chunks"], list)
        assert isinstance(proposal["suggested_days"], int)
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 4. POST /v1/rag/suggest-codesign con trigger vacío → 422 (campo requerido)
# ---------------------------------------------------------------------------


def test_rag_suggest_codesign_missing_trigger_returns_422():
    response = client.post(
        "/v1/rag/suggest-codesign",
        json={
            "user_id": USER_ID,
            # trigger is missing
            "trigger_description": "descripción sin trigger",
        },
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 5. POST /v1/rag/justify-plan → 200, justifications list, plan_text y date presentes
# ---------------------------------------------------------------------------


def test_rag_justify_plan_returns_200():
    mock = MagicMock()
    mock.table.return_value.select.return_value.execute.return_value.data = [
        {
            "id": CHUNK_ID,
            "content": "El aprendizaje situado requiere contextos reales.",
            "document_id": str(uuid.uuid4()),
            "page_number": 12,
            "section_title": "Marco pedagógico",
            "metadata": {},
        }
    ]
    override_supabase(mock)
    try:
        response = client.post(
            "/v1/rag/justify-plan",
            json={
                "user_id": USER_ID,
                "date": "2026-04-15",
                "plan_text": "Trabajaremos la comprensión lectora con textos del entorno local",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "justifications" in data
        assert isinstance(data["justifications"], list)
        assert "plan_text" in data
        assert "date" in data
        assert data["plan_text"] == "Trabajaremos la comprensión lectora con textos del entorno local"
        assert data["date"] == "2026-04-15"
    finally:
        restore_overrides()


# ---------------------------------------------------------------------------
# 6. POST /v1/rag/justify-plan con supabase None → justifications vacío
# ---------------------------------------------------------------------------


def test_rag_justify_plan_supabase_none_returns_empty():
    override_supabase_none()
    try:
        response = client.post(
            "/v1/rag/justify-plan",
            json={
                "user_id": USER_ID,
                "date": "2026-04-15",
                "plan_text": "Planeación del día",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["justifications"] == []
        assert data["plan_text"] == "Planeación del día"
        assert data["date"] == "2026-04-15"
    finally:
        restore_overrides()
