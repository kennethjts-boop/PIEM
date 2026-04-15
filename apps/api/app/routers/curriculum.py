from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import create_client

from app.config import settings
from app.models.curriculum import (
    AcademicProjectDetail,
    AcademicProjectSummary,
    CurriculumField,
    PDAItem,
    PartialProject,
)

router = APIRouter()


def get_supabase():
    """Return a Supabase client, or None when the URL is not configured."""
    if not settings.supabase_url:
        return None
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# ---------------------------------------------------------------------------
# GET /fields
# ---------------------------------------------------------------------------


@router.get("/fields", response_model=List[CurriculumField])
def get_fields(supabase=Depends(get_supabase)):
    """Lista de campos formativos con conteo de proyectos."""
    if supabase is None:
        return []
    result = supabase.table("curriculum_fields").select("*").execute()
    data = result.data or []
    return [CurriculumField(**row) for row in data]


# ---------------------------------------------------------------------------
# GET /fields/{field_id}/projects
# ---------------------------------------------------------------------------


@router.get("/fields/{field_id}/projects", response_model=List[AcademicProjectSummary])
def get_projects_by_field(
    field_id: UUID,
    trimester: Optional[int] = Query(default=None),
    grade: Optional[int] = Query(default=None),
    supabase=Depends(get_supabase),
):
    """Lista de academic_projects de un campo formativo."""
    if supabase is None:
        return []

    query = supabase.table("academic_projects").select("*").eq("field_id", str(field_id))

    if trimester is not None:
        query = query.eq("trimester", trimester)
    if grade is not None:
        query = query.eq("grade", grade)

    result = query.execute()
    data = result.data or []
    return [AcademicProjectSummary(**row) for row in data]


# ---------------------------------------------------------------------------
# GET /projects/{project_id}
# ---------------------------------------------------------------------------


@router.get("/projects/{project_id}", response_model=AcademicProjectDetail)
def get_project_detail(
    project_id: UUID,
    supabase=Depends(get_supabase),
):
    """Proyecto completo con partial_projects, PDA vinculados y dependencias."""
    if supabase is None:
        raise HTTPException(status_code=404, detail="Project not found")

    result = (
        supabase.table("academic_projects")
        .select("*")
        .eq("id", str(project_id))
        .single()
        .execute()
    )

    project_data = result.data
    if not project_data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch partial projects
    partial_result = (
        supabase.table("partial_projects")
        .select("*")
        .eq("academic_project_id", str(project_id))
        .execute()
    )
    partial_data = partial_result.data or []

    # Fetch PDAs linked to this project
    pda_result = (
        supabase.table("project_pdas")
        .select("*, pdas(*)")
        .eq("academic_project_id", str(project_id))
        .execute()
    )
    pda_rows = pda_result.data or []
    pdas = []
    for row in pda_rows:
        pda_info = row.get("pdas") or row
        if pda_info:
            try:
                pdas.append(PDAItem(**pda_info))
            except Exception:
                pass

    # Fetch dependencies
    dep_result = (
        supabase.table("project_dependencies")
        .select("depends_on_id")
        .eq("project_id", str(project_id))
        .execute()
    )
    dep_rows = dep_result.data or []
    dependencies = [row["depends_on_id"] for row in dep_rows if "depends_on_id" in row]

    partial_projects = []
    for row in partial_data:
        try:
            partial_projects.append(PartialProject(**row))
        except Exception:
            pass

    return AcademicProjectDetail(
        **project_data,
        partial_projects=partial_projects,
        pdas=pdas,
        dependencies=dependencies,
    )


# ---------------------------------------------------------------------------
# GET /pda
# ---------------------------------------------------------------------------


@router.get("/pda", response_model=List[PDAItem])
def get_pda(
    field: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    supabase=Depends(get_supabase),
):
    """Búsqueda/filtro de PDA."""
    if supabase is None:
        return []

    query = supabase.table("pdas").select("*")

    if field is not None:
        query = query.eq("field", field)

    if search is not None:
        query = query.ilike("description", f"%{search}%")

    result = query.execute()
    data = result.data or []
    return [PDAItem(**row) for row in data]
