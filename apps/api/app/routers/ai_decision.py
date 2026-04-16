import logging
from datetime import datetime, date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_supabase
from app.models.ai_decision import (
    DistributeProjectsRequest,
    DistributeProjectsResponse,
    ProjectDistributionItem,
    CoverageMap,
    FlexibilityIndexes,
    ScoreProjectPrioritiesRequest,
    ScoreProjectPrioritiesResponse,
    ProjectScore,
    SuggestNextActionRequest,
    SuggestNextActionResponse,
    CoverageReportResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# POST /distribute-projects
# ---------------------------------------------------------------------------


@router.post("/distribute-projects", response_model=DistributeProjectsResponse)
def distribute_projects(body: DistributeProjectsRequest, supabase=Depends(get_supabase)):
    """Calcula distribución inicial de proyectos en días disponibles."""
    empty = DistributeProjectsResponse(
        distribution_plan=[],
        coverage_map=CoverageMap(trimester_1=0, trimester_2=0, trimester_3=0),
        flexibility_indexes=FlexibilityIndexes(flexible=0, fixed=0),
    )

    if supabase is None:
        return empty

    try:
        result = (
            supabase.table("academic_projects")
            .select("*")
            .eq("field_id", body.field_id)
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.warning("distribute-projects DB error: %s", exc)
        return empty

    plan: list[ProjectDistributionItem] = []
    coverage = {1: 0, 2: 0, 3: 0}
    flexible_count = 0
    fixed_count = 0

    # Simple sequential day assignment starting from a reference date
    current_day = 1
    for row in rows:
        trimester = row.get("trimester", 1)
        seq = row.get("sequence_number", 0)
        is_flex = row.get("is_flexible", False)
        suggested_days = row.get("suggested_days", 5)

        # Build a rough suggested_date based on a school-year start
        school_start = date_type(2026, 8, 24)
        from datetime import timedelta
        suggested_date = school_start + timedelta(days=current_day - 1)
        current_day += suggested_days

        plan.append(
            ProjectDistributionItem(
                project_id=str(row.get("id", "")),
                suggested_date=suggested_date.isoformat(),
                trimester=trimester,
                sequence_number=seq,
            )
        )

        if trimester in coverage:
            coverage[trimester] += 1

        if is_flex:
            flexible_count += 1
        else:
            fixed_count += 1

    return DistributeProjectsResponse(
        distribution_plan=plan,
        coverage_map=CoverageMap(
            trimester_1=coverage[1], trimester_2=coverage[2], trimester_3=coverage[3]
        ),
        flexibility_indexes=FlexibilityIndexes(flexible=flexible_count, fixed=fixed_count),
    )


# ---------------------------------------------------------------------------
# POST /score-project-priorities
# ---------------------------------------------------------------------------


@router.post("/score-project-priorities", response_model=ScoreProjectPrioritiesResponse)
def score_project_priorities(
    body: ScoreProjectPrioritiesRequest, supabase=Depends(get_supabase)
):
    """Re-score de prioridades basado en contexto acumulado."""
    scored_at = datetime.utcnow().isoformat()

    if supabase is None:
        return ScoreProjectPrioritiesResponse(project_scores=[], scored_at=scored_at)

    try:
        result = (
            supabase.table("academic_projects")
            .select("*")
            .eq("field_id", body.field_id)
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.warning("score-project-priorities DB error: %s", exc)
        return ScoreProjectPrioritiesResponse(project_scores=[], scored_at=scored_at)

    scores: list[ProjectScore] = []
    for row in rows:
        priority = row.get("priority", 1)
        is_flex = row.get("is_flexible", False)
        # Simple heuristic: base score from original priority, penalize if flexible
        score = round(max(0.1, min(1.0, priority / 5.0)), 2)
        action = "mantener" if score >= 0.5 else "revisar"
        scores.append(
            ProjectScore(
                project_id=str(row.get("id", "")),
                priority_score=score,
                reason=(
                    f"Prioridad original {priority}. "
                    f"{'Proyecto flexible — puede ajustarse.' if is_flex else 'Proyecto fijo.'}"
                ),
                action=action,
            )
        )

    return ScoreProjectPrioritiesResponse(project_scores=scores, scored_at=scored_at)


# ---------------------------------------------------------------------------
# POST /suggest-next-action
# ---------------------------------------------------------------------------

_DEFAULT_SUGGESTION = SuggestNextActionResponse(
    suggestion=(
        "Retoma el proyecto vigente con una actividad de apertura que conecte con "
        "los intereses del grupo."
    ),
    rationale=(
        "Sin datos de contexto disponibles, se recomienda iniciar con una actividad "
        "motivacional que active conocimientos previos."
    ),
    confidence=0.5,
    calendar_impact="Sin impacto en el calendario por ahora.",
)


@router.post("/suggest-next-action", response_model=SuggestNextActionResponse)
def suggest_next_action(
    body: SuggestNextActionRequest, supabase=Depends(get_supabase)
):
    """Sugiere la próxima acción pedagógica para el día."""
    if supabase is None:
        return _DEFAULT_SUGGESTION

    # Fetch recent daily logs for context
    try:
        result = (
            supabase.table("daily_logs")
            .select("*")
            .eq("user_id", body.user_id)
            .order("date", desc=True)
            .limit(3)
            .execute()
        )
        logs = result.data or []
    except Exception as exc:
        logger.warning("suggest-next-action DB error: %s", exc)
        return _DEFAULT_SUGGESTION

    if not logs:
        return _DEFAULT_SUGGESTION

    # Build suggestion from most recent log
    latest = logs[0]
    participation = latest.get("participation_level", 3)
    narrative = latest.get("narrative", "")

    confidence = round(min(1.0, max(0.3, participation / 5.0)), 2)

    if participation >= 4:
        suggestion = (
            "Continúa con la siguiente etapa del proyecto actual aprovechando "
            "el alto nivel de participación del grupo."
        )
        rationale = (
            f"El registro más reciente muestra nivel de participación {participation}/5. "
            "Es buen momento para avanzar en contenidos más complejos."
        )
    elif participation >= 2:
        suggestion = (
            "Realiza una actividad de consolidación antes de avanzar al siguiente contenido."
        )
        rationale = (
            f"Participación moderada ({participation}/5). "
            "Se recomienda reforzar comprensión antes de avanzar."
        )
    else:
        suggestion = (
            "Diseña una actividad diagnóstica para identificar dificultades del grupo."
        )
        rationale = (
            f"Participación baja ({participation}/5). "
            "Conviene diagnosticar antes de continuar."
        )

    return SuggestNextActionResponse(
        suggestion=suggestion,
        rationale=rationale,
        confidence=confidence,
        calendar_impact="Ajuste menor posible en el calendario si se dedica una sesión de diagnóstico.",
    )


# ---------------------------------------------------------------------------
# GET /coverage-report
# ---------------------------------------------------------------------------


@router.get("/coverage-report", response_model=CoverageReportResponse)
def coverage_report(
    user_id: str = Query(...),
    trimester: int = Query(default=1, ge=1, le=3),
    supabase=Depends(get_supabase),
):
    """Informe de cobertura curricular del trimestre."""
    default = CoverageReportResponse(
        projects_covered=0,
        pda_addressed=0,
        remaining_days=0,
        risk_level="low",
        recommendations=[],
    )

    if supabase is None:
        return default

    try:
        result = (
            supabase.table("academic_projects")
            .select("*")
            .eq("trimester", trimester)
            .execute()
        )
        rows = result.data or []
    except Exception as exc:
        logger.warning("coverage-report DB error: %s", exc)
        return default

    projects_covered = len(rows)
    total_days = sum(r.get("suggested_days", 0) for r in rows)
    # Approximate trimester has ~60 school days
    trimester_days = 60
    remaining_days = max(0, trimester_days - total_days)

    # Risk heuristic
    if projects_covered == 0:
        risk_level = "high"
        recommendations = [
            "No se han registrado proyectos para este trimestre.",
            "Revisa la configuración curricular con tu coordinador.",
        ]
    elif remaining_days < 5:
        risk_level = "high"
        recommendations = [
            "Los días disponibles son muy pocos. Considera priorizar proyectos esenciales.",
            "Revisa si algún proyecto puede reducirse sin afectar los PDA.",
        ]
    elif remaining_days < 15:
        risk_level = "medium"
        recommendations = [
            "El tiempo es ajustado. Mantén el ritmo planificado.",
            "Identifica actividades que puedan consolidarse.",
        ]
    else:
        risk_level = "low"
        recommendations = [
            "La cobertura va bien. Continúa con el plan establecido.",
        ]

    return CoverageReportResponse(
        projects_covered=projects_covered,
        pda_addressed=projects_covered,  # Simplified approximation
        remaining_days=remaining_days,
        risk_level=risk_level,
        recommendations=recommendations,
    )
