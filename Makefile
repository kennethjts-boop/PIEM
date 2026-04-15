.PHONY: dev-api dev-web test-api install-api

dev-api:
	cd apps/api && uvicorn app.main:app --reload --port 8000

dev-web:
	cd apps/web && npm run dev

test-api:
	cd apps/api && pytest

install-api:
	cd apps/api && pip install -r requirements.txt -r requirements-dev.txt
