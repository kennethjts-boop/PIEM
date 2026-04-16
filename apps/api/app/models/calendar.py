from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import date


class CalendarGenerateRequest(BaseModel):
    user_id: UUID
    school_year_id: UUID
    field_id: UUID
    context_notes: Optional[str] = None


class CalendarGenerateResponse(BaseModel):
    calendar_id: UUID
    total_entries: int
    distribution_summary: Dict[str, Any]


class CalendarEntry(BaseModel):
    id: UUID
    entry_type: str
    academic_project_id: Optional[UUID] = None
    codesign_id: Optional[UUID] = None
    status: str
    notes: Optional[str] = None


class CalendarDay(BaseModel):
    date: str  # YYYY-MM-DD
    entries: List[CalendarEntry]
    entry_count: int


class CalendarMonthResponse(BaseModel):
    year: int
    month: int
    days: List[CalendarDay]


class CalendarDayResponse(BaseModel):
    date: str
    user_id: UUID
    entries: List[CalendarEntry]
    total_entries: int


class AdjustmentOption(BaseModel):
    type: str  # "shift" | "compress" | "drop"
    impact: str
    preview: str


class MarkUnavailableRequest(BaseModel):
    user_id: UUID
    date: date
    reason: str


class MarkUnavailableResponse(BaseModel):
    options: List[AdjustmentOption]


class ApplyAdjustmentRequest(BaseModel):
    user_id: UUID
    adjustment_option: Dict[str, Any]
    confirmed_by: str = "teacher"


class ApplyAdjustmentResponse(BaseModel):
    adjustment_id: UUID
    adjusted_entries: int
    impact_summary: str
    coverage_risk: str


class InsertCodesignRequest(BaseModel):
    user_id: UUID
    date: date
    codesign_id: UUID
    duration_days: int = Field(ge=1, le=30)


class InsertCodesignResponse(BaseModel):
    inserted_entry_id: UUID
    date: str
    codesign_id: UUID
    duration_days: int


class RecalculateRequest(BaseModel):
    user_id: UUID
    trigger_type: str  # "bitacora" | "attendance" | "manual"
    context_delta: Optional[str] = None


class RecalculateResponse(BaseModel):
    status: str
    trigger_type: str
    user_id: UUID
    queued_at: str
