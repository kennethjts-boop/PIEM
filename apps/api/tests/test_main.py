from fastapi.testclient import TestClient
from app.main import app
from app.routers import curriculum, calendar, context, rag, ai_decision

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_routers_registered():
    # Routers are empty (placeholder) so they don't generate routes,
    # but we verify the router objects are properly imported and are APIRouter instances
    from fastapi import APIRouter
    assert isinstance(curriculum.router, APIRouter)
    assert isinstance(calendar.router, APIRouter)
    assert isinstance(context.router, APIRouter)
    assert isinstance(rag.router, APIRouter)
    assert isinstance(ai_decision.router, APIRouter)
