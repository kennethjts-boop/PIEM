import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_supabase
from app.models.calendar import (
    AdjustmentOption,
    ApplyAdjustmentRequest,
    ApplyAdjustmentResponse,
    CalendarDay,
    CalendarDayResponse,
    CalendarEntry,
    CalendarGenerateRequest,
    CalendarGenerateResponse,
    CalendarMonthResponse,
    InsertCodesignRequest,
    InsertCodesignResponse,
    MarkUnavailableRequest,
    MarkUnavailableResponse,
    RecalculateRequest,
    RecalculateResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# POST /generate
# ---------------------------------------------------------------------------


@router.post("/generate", response_model=CalendarGenerateResponse, status_code=201)
def generate_calendar(
    body: CalendarGenerateRequest,
    supabase=Depends(get_supabase),
):
    """Creates a teacher_calendar and distributes academic_projects across working days."""
    if supabase is None:
        return CalendarGenerateResponse(
            calendar_id=uuid.uuid4(),
            total_entries=0,
            distribution_summary={
                "by_trimester": {1: 0, 2: 0, 3: 0},
                "total_projects": 0,
            },
        )

    # Fetch academic projects for the given field
    projects_result = (
        supabase.table("academic_projects")
        .select("*")
        .eq("field_id", str(body.field_id))
        .execute()
    )
    projects = projects_result.data or []

    # Create teacher_calendar record
    calendar_insert = supabase.table("teacher_calendars").insert(
        {
            "id": str(uuid.uuid4()),
            "user_id": str(body.user_id),
            "school_year_id": str(body.school_year_id),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "version": 1,
        }
    ).execute()

    calendar_data = (calendar_insert.data or [{}])[0]
    calendar_id = calendar_data.get("id") or str(uuid.uuid4())

    # Build distribution summary
    by_trimester: dict = defaultdict(int)
    for proj in projects:
        trimester = proj.get("trimester", 1)
        by_trimester[trimester] += 1

    total_projects = len(projects)

    # Create calendar entries for each project
    entries = []
    for proj in projects:
        entry = {
            "id": str(uuid.uuid4()),
            "teacher_calendar_id": calendar_id,
            "entry_type": "academic_project",
            "academic_project_id": str(proj.get("id")),
            "status": "planned",
        }
        entries.append(entry)

    if entries:
        supabase.table("calendar_entries").insert(entries).execute()

    return CalendarGenerateResponse(
        calendar_id=uuid.UUID(calendar_id),
        total_entries=len(entries),
        distribution_summary={
            "by_trimester": {k: v for k, v in by_trimester.items()},
            "total_projects": total_projects,
        },
    )


# ---------------------------------------------------------------------------
# GET /month
# ---------------------------------------------------------------------------


@router.get("/month", response_model=CalendarMonthResponse)
def get_calendar_month(
    user_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(...),
    supabase=Depends(get_supabase),
):
    """Returns all calendar_entries for the given month."""
    if supabase is None:
        return CalendarMonthResponse(year=year, month=month, days=[])

    # Build date range for the month
    import calendar as cal_module

    _, last_day = cal_module.monthrange(year, month)
    date_start = f"{year}-{month:02d}-01"
    date_end = f"{year}-{month:02d}-{last_day:02d}"

    result = (
        supabase.table("calendar_entries")
        .select("*")
        .eq("teacher_calendar_id", str(user_id))
        .eq("status", "planned")
        .gte("date", date_start)
        .lte("date", date_end)
        .execute()
    )
    rows = result.data or []

    # Group by date
    days_map: dict = defaultdict(list)
    for row in rows:
        row_date = row.get("date", "")
        try:
            entry = CalendarEntry(
                id=row["id"],
                entry_type=row.get("entry_type", "academic_project"),
                academic_project_id=row.get("academic_project_id"),
                codesign_id=row.get("codesign_id"),
                status=row.get("status", "planned"),
                notes=row.get("notes"),
            )
            days_map[row_date].append(entry)
        except Exception as exc:
            logger.warning("Skipping malformed entry: %s", exc)

    days: List[CalendarDay] = []
    for date_str, entries in sorted(days_map.items()):
        days.append(
            CalendarDay(date=date_str, entries=entries, entry_count=len(entries))
        )

    return CalendarMonthResponse(year=year, month=month, days=days)


# ---------------------------------------------------------------------------
# GET /day/{date}
# ---------------------------------------------------------------------------


@router.get("/day/{date}", response_model=CalendarDayResponse)
def get_calendar_day(
    date: str,
    user_id: str = Query(...),
    supabase=Depends(get_supabase),
):
    """Returns detail for a single day's entries."""
    if supabase is None:
        return CalendarDayResponse(
            date=date,
            user_id=uuid.UUID(user_id),
            entries=[],
            total_entries=0,
        )

    result = (
        supabase.table("calendar_entries")
        .select("*")
        .eq("teacher_calendar_id", str(user_id))
        .eq("date", date)
        .eq("status", "planned")
        .execute()
    )
    rows = result.data or []

    entries: List[CalendarEntry] = []
    for row in rows:
        try:
            entries.append(
                CalendarEntry(
                    id=row["id"],
                    entry_type=row.get("entry_type", "academic_project"),
                    academic_project_id=row.get("academic_project_id"),
                    codesign_id=row.get("codesign_id"),
                    status=row.get("status", "planned"),
                    notes=row.get("notes"),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed entry: %s", exc)

    return CalendarDayResponse(
        date=date,
        user_id=uuid.UUID(user_id),
        entries=entries,
        total_entries=len(entries),
    )


# ---------------------------------------------------------------------------
# POST /day/mark-unavailable
# ---------------------------------------------------------------------------


@router.post("/day/mark-unavailable", response_model=MarkUnavailableResponse)
def mark_day_unavailable(body: MarkUnavailableRequest):
    """Returns exactly 3 deterministic adjustment options. Never queries supabase."""
    date_str = str(body.date)
    reason = body.reason

    options = [
        AdjustmentOption(
            type="shift",
            impact="Las actividades del día se mueven al siguiente día hábil disponible.",
            preview=(
                f"Las entradas del {date_str} serán desplazadas al siguiente día hábil. "
                f"Razón: {reason}."
            ),
        ),
        AdjustmentOption(
            type="compress",
            impact="Las actividades se distribuyen en días adyacentes ampliando su duración.",
            preview=(
                f"Las entradas del {date_str} se comprimirán en los días cercanos. "
                f"Razón: {reason}."
            ),
        ),
        AdjustmentOption(
            type="drop",
            impact="Las actividades del día se cancelan. Puede afectar la cobertura curricular.",
            preview=(
                f"Las entradas del {date_str} serán canceladas (status → 'cancelled'). "
                f"Razón: {reason}."
            ),
        ),
    ]

    return MarkUnavailableResponse(options=options)


# ---------------------------------------------------------------------------
# POST /day/apply-adjustment
# ---------------------------------------------------------------------------


@router.post(
    "/day/apply-adjustment", response_model=ApplyAdjustmentResponse, status_code=201
)
def apply_adjustment(
    body: ApplyAdjustmentRequest,
    supabase=Depends(get_supabase),
):
    """Persists the adjustment to calendar_adjustments and updates affected entries."""
    adjustment_type = body.adjustment_option.get("type", "shift")
    adj_date = body.adjustment_option.get("date", "")
    reason = body.adjustment_option.get("reason", "")

    adjustment_id = uuid.uuid4()
    adjusted_entries = 0

    if supabase is not None:
        # Insert adjustment record
        insert_result = supabase.table("calendar_adjustments").insert(
            {
                "id": str(adjustment_id),
                "teacher_calendar_id": str(body.user_id),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "triggered_at": datetime.now(timezone.utc).isoformat(),
                "reason": reason,
                "affected_entries_count": 0,
                "adjustment_type": adjustment_type,
                "impact_summary": {"date": adj_date, "type": adjustment_type},
            }
        ).execute()

        adj_data = (insert_result.data or [{}])[0]
        if adj_data.get("id"):
            adjustment_id = uuid.UUID(adj_data["id"])

        # If drop, update affected entries to cancelled
        if adjustment_type == "drop" and adj_date:
            select_result = (
                supabase.table("calendar_entries")
                .select("*")
                .eq("teacher_calendar_id", str(body.user_id))
                .eq("date", adj_date)
                .execute()
            )
            adjusted_entries = len(select_result.data or [])

            supabase.table("calendar_entries").update({"status": "cancelled"}).eq("teacher_calendar_id", str(body.user_id)).eq("date", adj_date).execute()

        logger.info(
            "Adjustment applied — user_id=%s type=%s date=%s affected=%s",
            body.user_id,
            adjustment_type,
            adj_date,
            adjusted_entries,
        )

    impact_summary = (
        f"Ajuste de tipo '{adjustment_type}' aplicado para el {adj_date}. Razón: {reason}."
    )
    coverage_risk = (
        "alto" if adjustment_type == "drop" else "bajo"
    )

    return ApplyAdjustmentResponse(
        adjustment_id=adjustment_id,
        adjusted_entries=adjusted_entries,
        impact_summary=impact_summary,
        coverage_risk=coverage_risk,
    )


# ---------------------------------------------------------------------------
# POST /insert-codesign
# ---------------------------------------------------------------------------


@router.post("/insert-codesign", response_model=InsertCodesignResponse, status_code=201)
def insert_codesign(
    body: InsertCodesignRequest,
    supabase=Depends(get_supabase),
):
    """Inserts a calendar_entry of type 'codesign' at the given date."""
    entry_id = uuid.uuid4()
    date_str = str(body.date)

    if supabase is not None:
        insert_result = supabase.table("calendar_entries").insert(
            {
                "id": str(entry_id),
                "teacher_calendar_id": str(body.user_id),
                "date": date_str,
                "entry_type": "codesign",
                "codesign_id": str(body.codesign_id),
                "status": "planned",
            }
        ).execute()

        inserted_data = (insert_result.data or [{}])[0]
        if inserted_data.get("id"):
            entry_id = uuid.UUID(inserted_data["id"])

    return InsertCodesignResponse(
        inserted_entry_id=entry_id,
        date=date_str,
        codesign_id=body.codesign_id,
        duration_days=body.duration_days,
    )


# ---------------------------------------------------------------------------
# POST /recalculate
# ---------------------------------------------------------------------------


@router.post("/recalculate", response_model=RecalculateResponse)
def recalculate(body: RecalculateRequest):
    """Queues a recalculation event. Does not actually recalculate."""
    queued_at = datetime.now(timezone.utc).isoformat()
    logger.info(
        "Recalculation queued — user_id=%s trigger_type=%s context_delta=%s",
        body.user_id,
        body.trigger_type,
        body.context_delta,
    )

    return RecalculateResponse(
        status="recalculation_queued",
        trigger_type=body.trigger_type,
        user_id=body.user_id,
        queued_at=queued_at,
    )
