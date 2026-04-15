from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List


class CurriculumField(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    project_count: int = 0


class AcademicProjectSummary(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    trimester: int
    suggested_days: int
    priority: int
    is_flexible: bool
    pda_count: int = 0


class PDAItem(BaseModel):
    id: UUID
    code: str
    description: str
    level: int


class PartialProject(BaseModel):
    id: UUID
    name: str
    sequence_order: int
    suggested_days: int


class AcademicProjectDetail(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    trimester: int
    suggested_days: int
    priority: int
    is_flexible: bool
    partial_projects: List[PartialProject] = []
    pdas: List[PDAItem] = []
    dependencies: List[UUID] = []
