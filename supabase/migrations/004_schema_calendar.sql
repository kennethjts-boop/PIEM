-- Migration 004: Calendar
-- Note: calendar_entries.codesign_id FK to codesigns is added in migration 005
-- after the codesigns table is created.

CREATE TABLE school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_working_days INTEGER NOT NULL,
  label TEXT,                  -- ej. "2025-2026"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_calendar_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID REFERENCES school_years(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'working',  -- 'working' | 'holiday' | 'suspension' | 'event'
  label TEXT,
  UNIQUE (school_year_id, date)
);

CREATE TABLE teacher_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES school_years(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  entry_type TEXT NOT NULL,  -- 'academic_project' | 'codesign' | 'extracurricular' | 'recovery' | 'buffer'
  academic_project_id UUID REFERENCES academic_projects(id),
  codesign_id UUID,          -- FK to codesigns added in migration 005
  time_start TIME,
  time_end TIME,
  status TEXT NOT NULL DEFAULT 'planned',  -- 'planned' | 'completed' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE calendar_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT NOT NULL,
  affected_entries_count INTEGER NOT NULL DEFAULT 0,
  adjustment_type TEXT NOT NULL,  -- 'shift' | 'compress' | 'drop' | 'codesign_insert'
  impact_summary JSONB
);
