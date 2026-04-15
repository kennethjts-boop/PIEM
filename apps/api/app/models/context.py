from pydantic import BaseModel, Field, model_validator
from uuid import UUID
from typing import Optional, List
from datetime import date


class DailyLogCreate(BaseModel):
    user_id: UUID
    date: date
    narrative: Optional[str] = None
    advances: Optional[str] = None
    difficulties: Optional[str] = None
    participation_level: Optional[int] = Field(default=None, ge=1, le=5)
    behavior_notes: Optional[str] = None
    group_needs: Optional[str] = None
    ideas_for_tomorrow: Optional[str] = None


class DailyLogResponse(BaseModel):
    log_id: UUID
    date: date
    user_id: UUID


class AttendanceCreate(BaseModel):
    user_id: UUID
    date: date
    total_students: int
    present: int
    absent_ids: Optional[List[str]] = []

    @model_validator(mode="after")
    def present_not_exceed_total(self):
        if self.present > self.total_students:
            raise ValueError("present cannot exceed total_students")
        return self


class AttendanceResponse(BaseModel):
    record_id: UUID
    date: date
    attendance_rate: float


class EvaluationItem(BaseModel):
    student_id: str
    criteria: str
    score: Optional[float] = None
    observation: Optional[str] = None


class EvaluationCreate(BaseModel):
    user_id: UUID
    date: date
    evaluations: List[EvaluationItem]


class EvaluationResponse(BaseModel):
    saved_count: int
    date: date


class ContextSummaryResponse(BaseModel):
    progress_rate: float
    active_alerts: int
    top_interests: List[str]
    period: dict
