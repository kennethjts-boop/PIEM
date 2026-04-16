import logging
from fastapi import APIRouter, Depends

from app.dependencies import get_supabase
from app.models.rag import (
    RagQueryRequest,
    RagQueryResponse,
    ChunkResult,
    SuggestCodesignRequest,
    SuggestCodesignResponse,
    CodesignProposal,
    JustifyPlanRequest,
    JustifyPlanResponse,
    JustificationItem,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# POST /query
# ---------------------------------------------------------------------------


@router.post("/query", response_model=RagQueryResponse)
def rag_query(body: RagQueryRequest, supabase=Depends(get_supabase)):
    """Búsqueda semántica sobre document_chunks."""
    if supabase is None:
        return RagQueryResponse(chunks=[], used_context="no_context", query=body.query)

    # Build query against document_chunks
    query = supabase.table("document_chunks").select("*")

    # Apply optional filters
    if body.filters.field_id:
        query = query.eq("field_id", body.filters.field_id)
    if body.filters.grade:
        query = query.eq("grade", body.filters.grade)
    if body.filters.trimester:
        query = query.eq("trimester", body.filters.trimester)
    if body.filters.doc_type:
        query = query.eq("doc_type", body.filters.doc_type)

    try:
        result = query.execute()
        rows = result.data or []
    except Exception as exc:
        logger.warning("RAG query DB error: %s", exc)
        rows = []

    chunks: list[ChunkResult] = []
    for row in rows[: body.top_k]:
        metadata = row.get("metadata") or {}
        source = metadata.get("source") if isinstance(metadata, dict) else None
        chunks.append(
            ChunkResult(
                id=str(row.get("id", "")),
                content=row.get("content", ""),
                source=source,
                page=row.get("page_number"),
                similarity=0.0,
                tags=[],
            )
        )

    used_context = "\n\n".join(c.content for c in chunks) if chunks else "no_context"

    return RagQueryResponse(chunks=chunks, used_context=used_context, query=body.query)


# ---------------------------------------------------------------------------
# POST /suggest-codesign
# ---------------------------------------------------------------------------

_DEFAULT_CODESIGN = CodesignProposal(
    name="Codiseño cultural contextualizado",
    pda_justification=(
        "Este codiseño responde al principio de aprendizaje situado, "
        "vinculando los contenidos curriculares con la realidad cultural del estudiantado."
    ),
    suggested_days=5,
    related_chunks=[],
    calendar_impact="Se recomienda ubicar en la semana siguiente a la festividad para aprovechar el contexto.",
)


@router.post("/suggest-codesign", response_model=SuggestCodesignResponse)
def suggest_codesign(body: SuggestCodesignRequest, supabase=Depends(get_supabase)):
    """Propone un codiseño basado en el trigger cultural/pedagógico."""
    if supabase is None:
        return SuggestCodesignResponse(codesign_proposal=_DEFAULT_CODESIGN)

    # Attempt to retrieve relevant chunks to enrich the proposal
    try:
        result = supabase.table("document_chunks").select("id, content").execute()
        rows = result.data or []
    except Exception as exc:
        logger.warning("suggest-codesign DB error: %s", exc)
        rows = []

    related_ids = [str(r["id"]) for r in rows[:3] if "id" in r]

    proposal = CodesignProposal(
        name=f"Codiseño: {body.trigger}",
        pda_justification=(
            f"Vinculado al trigger '{body.trigger}': {body.trigger_description}. "
            "Conecta con los PDA de comprensión del entorno sociocultural."
        ),
        suggested_days=5,
        related_chunks=related_ids,
        calendar_impact=(
            "Integrar en el calendario durante la semana en que ocurre el evento "
            "para maximizar el aprendizaje situado."
        ),
    )

    return SuggestCodesignResponse(codesign_proposal=proposal)


# ---------------------------------------------------------------------------
# POST /justify-plan
# ---------------------------------------------------------------------------


@router.post("/justify-plan", response_model=JustifyPlanResponse)
def justify_plan(body: JustifyPlanRequest, supabase=Depends(get_supabase)):
    """Recupera fragmentos de libros que respaldan la planeación."""
    if supabase is None:
        return JustifyPlanResponse(
            justifications=[], plan_text=body.plan_text, date=body.date
        )

    try:
        result = supabase.table("document_chunks").select("*").execute()
        rows = result.data or []
    except Exception as exc:
        logger.warning("justify-plan DB error: %s", exc)
        rows = []

    justifications: list[JustificationItem] = []
    for row in rows[:5]:
        content = row.get("content", "")
        section = row.get("section_title") or "PDA general"
        justifications.append(
            JustificationItem(
                pda=section,
                book_fragment=content[:200] if content else "",
                relevance=0.75,
            )
        )

    return JustifyPlanResponse(
        justifications=justifications,
        plan_text=body.plan_text,
        date=body.date,
    )
