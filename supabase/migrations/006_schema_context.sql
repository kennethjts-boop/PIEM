-- Migration 006: Live Teacher Context

CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  narrative TEXT,
  advances TEXT,
  difficulties TEXT,
  participation_level INTEGER CHECK (participation_level BETWEEN 1 AND 5),
  behavior_notes TEXT,
  group_needs TEXT,
  ideas_for_tomorrow TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  present INTEGER NOT NULL DEFAULT 0,
  absent_ids TEXT[],          -- array de nombres/ids de alumnos ausentes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,    -- identificador del alumno
  date DATE NOT NULL,
  criteria TEXT NOT NULL,
  score NUMERIC(4,2),
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interest_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  signal_type TEXT NOT NULL,   -- 'cultural' | 'topic' | 'trend' | 'teacher_note'
  description TEXT NOT NULL,
  strength INTEGER NOT NULL DEFAULT 3 CHECK (strength BETWEEN 1 AND 5)
);

CREATE TABLE pedagogical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type TEXT NOT NULL,    -- 'rezago' | 'interest_spike' | 'pace_risk' | 'coverage_risk'
  severity TEXT NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high'
  message TEXT NOT NULL,
  suggested_action TEXT,
  resolved_at TIMESTAMPTZ
);
