from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


# ---------------------------------------------------------------------------
# distribute-projects
# ---------------------------------------------------------------------------


class DistributeProjectsRequest(BaseModel):
    user_id: str
    field_id: str
    school_year_id: str
    initial_context: Optional[str] = None


class ProjectDistributionItem(BaseModel):
    project_id: str
    suggested_date: str
    trimester: int
    sequence_number: int


class CoverageMap(BaseModel):
    trimester_1: int = 0
    trimester_2: int = 0
    trimester_3: int = 0


class FlexibilityIndexes(BaseModel):
    flexible: int = 0
    fixed: int = 0


class DistributeProjectsResponse(BaseModel):
    distribution_plan: List[ProjectDistributionItem]
    coverage_map: CoverageMap
    flexibility_indexes: FlexibilityIndexes


# ---------------------------------------------------------------------------
# score-project-priorities
# ---------------------------------------------------------------------------


class ScoreProjectPrioritiesRequest(BaseModel):
    user_id: str
    field_id: str


class ProjectScore(BaseModel):
    project_id: str
    priority_score: float
    reason: str
    action: str


class ScoreProjectPrioritiesResponse(BaseModel):
    project_scores: List[ProjectScore]
    scored_at: str


# ---------------------------------------------------------------------------
# suggest-next-action
# ---------------------------------------------------------------------------


class SuggestNextActionRequest(BaseModel):
    user_id: str
    date: str


class SuggestNextActionResponse(BaseModel):
    suggestion: str
    rationale: str
    confidence: float = Field(ge=0.0, le=1.0)
    calendar_impact: str


# ---------------------------------------------------------------------------
# coverage-report
# ---------------------------------------------------------------------------


class CoverageReportResponse(BaseModel):
    projects_covered: int
    pda_addressed: int
    remaining_days: int
    risk_level: str  # "low" | "medium" | "high"
    recommendations: List[str]
