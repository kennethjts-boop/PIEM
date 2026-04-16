import uuid
from datetime import date as date_type
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_supabase
from app.models.context import (
    AttendanceCreate,
    AttendanceResponse,
    ContextSummaryResponse,
    DailyLogCreate,
    DailyLogResponse,
    EvaluationCreate,
    EvaluationResponse,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /daily-log
# ---------------------------------------------------------------------------


@router.post("/daily-log", response_model=DailyLogResponse, status_code=201)
def create_daily_log(
    body: DailyLogCreate,
    supabase=Depends(get_supabase),
):
    """Guarda bitácora diaria."""
    new_id = uuid.uuid4()

    if supabase is None:
        return DailyLogResponse(
            log_id=new_id,
            date=body.date,
            user_id=body.user_id,
        )

    record = body.model_dump()
    record["user_id"] = str(record["user_id"])
    record["date"] = str(record["date"])

    result = supabase.table("daily_logs").insert(record).execute()
    row = (result.data or [{}])[0]
    return DailyLogResponse(
        log_id=row.get("id", new_id),
        date=body.date,
        user_id=body.user_id,
    )


# ---------------------------------------------------------------------------
# POST /attendance
# ---------------------------------------------------------------------------


@router.post("/attendance", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    body: AttendanceCreate,
    supabase=Depends(get_supabase),
):
    """Guarda registro de asistencia."""
    attendance_rate = (
        body.present / body.total_students if body.total_students > 0 else 0.0
    )
    new_id = uuid.uuid4()

    if supabase is None:
        return AttendanceResponse(
            record_id=new_id,
            date=body.date,
            attendance_rate=attendance_rate,
        )

    record = body.model_dump()
    record["user_id"] = str(record["user_id"])
    record["date"] = str(record["date"])
    record["attendance_rate"] = attendance_rate

    result = supabase.table("attendance_records").insert(record).execute()
    row = (result.data or [{}])[0]
    return AttendanceResponse(
        record_id=row.get("id", new_id),
        date=body.date,
        attendance_rate=attendance_rate,
    )


# ---------------------------------------------------------------------------
# POST /evaluation
# ---------------------------------------------------------------------------


@router.post("/evaluation", response_model=EvaluationResponse, status_code=201)
def create_evaluation(
    body: EvaluationCreate,
    supabase=Depends(get_supabase),
):
    """Guarda evaluaciones de estudiantes."""
    if not body.evaluations:
        return EvaluationResponse(saved_count=0, date=body.date)

    records = [
        {
            "user_id": str(body.user_id),
            "date": str(body.date),
            "student_id": item.student_id,
            "criteria": item.criteria,
            "score": item.score,
            "observation": item.observation,
        }
        for item in body.evaluations
    ]

    if supabase is None:
        return EvaluationResponse(saved_count=len(records), date=body.date)

    result = supabase.table("evaluations").insert(records).execute()
    saved = result.data or []
    return EvaluationResponse(saved_count=len(saved), date=body.date)


# ---------------------------------------------------------------------------
# GET /summary
# ---------------------------------------------------------------------------


@router.get("/summary", response_model=ContextSummaryResponse)
def get_summary(
    user_id: str = Query(...),
    from_date: Optional[date_type] = Query(default=None, alias="from"),
    to_date: Optional[date_type] = Query(default=None, alias="to"),
    supabase=Depends(get_supabase),
):
    """Resumen analítico del periodo."""
    if supabase is None:
        return ContextSummaryResponse(
            progress_rate=0.0,
            active_alerts=0,
            top_interests=[],
            period={
                "from": str(from_date) if from_date else None,
                "to": str(to_date) if to_date else None,
            },
        )

    query = supabase.table("daily_logs").select("*").eq("user_id", user_id)

    if from_date is not None:
        query = query.gte("date", str(from_date))
    if to_date is not None:
        query = query.lte("date", str(to_date))

    result = query.execute()
    logs = result.data or []

    # Calculate progress_rate from participation_level average (scale 1–5 → 0–1)
    participation_values = [
        log["participation_level"]
        for log in logs
        if log.get("participation_level") is not None
    ]
    if participation_values:
        avg_participation = sum(participation_values) / len(participation_values)
        progress_rate = round(avg_participation / 5.0, 4)
    else:
        progress_rate = 0.0

    # active_alerts: logs with participation_level <= 2
    active_alerts = sum(
        1 for log in logs
        if log.get("participation_level") is not None
        and log["participation_level"] <= 2
    )

    return ContextSummaryResponse(
        progress_rate=progress_rate,
        active_alerts=active_alerts,
        top_interests=[],
        period={
            "from": str(from_date) if from_date else None,
            "to": str(to_date) if to_date else None,
        },
    )
