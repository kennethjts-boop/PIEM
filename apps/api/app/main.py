from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import curriculum, calendar, context, rag, ai_decision

app = FastAPI(
    title="ProfeIA API",
    description="Orquestador pedagógico para docentes de Telesecundaria",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(curriculum.router, prefix="/v1/curriculum", tags=["curriculum"])
app.include_router(calendar.router, prefix="/v1/calendar", tags=["calendar"])
app.include_router(context.router, prefix="/v1/context", tags=["context"])
app.include_router(rag.router, prefix="/v1/rag", tags=["rag"])
app.include_router(ai_decision.router, prefix="/v1/ai-decision", tags=["ai-decision"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "profeia-api"}
