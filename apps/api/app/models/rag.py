from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List, Dict, Any


class RagFilters(BaseModel):
    field_id: Optional[str] = None
    grade: Optional[int] = None
    trimester: Optional[int] = None
    doc_type: Optional[str] = None


class RagQueryRequest(BaseModel):
    user_id: str
    query: str
    filters: RagFilters = Field(default_factory=RagFilters)
    top_k: int = 5


class ChunkResult(BaseModel):
    id: str
    content: str
    source: Optional[str] = None
    page: Optional[int] = None
    similarity: float = 0.0
    tags: List[str] = []


class RagQueryResponse(BaseModel):
    chunks: List[ChunkResult]
    used_context: str
    query: str


# ---------------------------------------------------------------------------
# suggest-codesign
# ---------------------------------------------------------------------------


class SuggestCodesignRequest(BaseModel):
    user_id: str
    trigger: str
    trigger_description: str


class CodesignProposal(BaseModel):
    name: str
    pda_justification: str
    suggested_days: int
    related_chunks: List[str] = []
    calendar_impact: str


class SuggestCodesignResponse(BaseModel):
    codesign_proposal: CodesignProposal


# ---------------------------------------------------------------------------
# justify-plan
# ---------------------------------------------------------------------------


class JustifyPlanRequest(BaseModel):
    user_id: str
    date: str
    plan_text: str


class JustificationItem(BaseModel):
    pda: str
    book_fragment: str
    relevance: float


class JustifyPlanResponse(BaseModel):
    justifications: List[JustificationItem]
    plan_text: str
    date: str
