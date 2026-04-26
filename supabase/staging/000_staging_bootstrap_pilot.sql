-- Staging bootstrap for Profeia pilot
-- Purpose: create minimum schema + RLS baseline required by pilot flows
-- Safe to run on empty staging databases. Avoid re-running mixed with full migration chain without review.

BEGIN;

-- Extensions used by schema defaults/indexes
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Core institution + identity tables
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cct TEXT UNIQUE,
  zone TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  grade INTEGER,
  group_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context tables used by dashboard pilot
CREATE TABLE IF NOT EXISTS daily_logs (
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

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  present INTEGER NOT NULL DEFAULT 0,
  absent_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  date DATE NOT NULL,
  criteria TEXT NOT NULL,
  score NUMERIC(4,2),
  observation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedagogical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  suggested_action TEXT,
  resolved_at TIMESTAMPTZ
);

-- Minimal curriculum table so documents.field_id FK stays compatible
CREATE TABLE IF NOT EXISTS curriculum_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table for pilot document management
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  field_id UUID REFERENCES curriculum_fields(id),
  grade INTEGER,
  trimester INTEGER CHECK (trimester BETWEEN 1 AND 3),
  file_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  owner_user_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Useful pilot indexes
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records (user_id, date);
CREATE INDEX IF NOT EXISTS idx_pedagogical_alerts_user ON pedagogical_alerts (user_id, resolved_at);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_school ON documents (school_id, created_at DESC);

-- RLS enablement
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedagogical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Recreate policies idempotently
DROP POLICY IF EXISTS "teacher_own_profile" ON users;
CREATE POLICY "teacher_own_profile" ON users FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "teacher_own_logs" ON daily_logs;
CREATE POLICY "teacher_own_logs" ON daily_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teacher_own_attendance" ON attendance_records;
CREATE POLICY "teacher_own_attendance" ON attendance_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teacher_own_evaluations" ON evaluation_records;
CREATE POLICY "teacher_own_evaluations" ON evaluation_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teacher_own_alerts" ON pedagogical_alerts;
CREATE POLICY "teacher_own_alerts" ON pedagogical_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "documents_read_scoped" ON documents;
DROP POLICY IF EXISTS "documents_write_scoped_insert" ON documents;
DROP POLICY IF EXISTS "documents_write_scoped_update" ON documents;
DROP POLICY IF EXISTS "documents_write_scoped_delete" ON documents;

CREATE POLICY "documents_read_scoped" ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role IN ('admin', 'superadmin')
          OR documents.owner_user_id = auth.uid()
          OR (documents.school_id IS NOT NULL AND u.school_id = documents.school_id)
        )
    )
  );

CREATE POLICY "documents_write_scoped_insert" ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('teacher', 'director', 'admin', 'superadmin')
        AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
        AND (
          u.role IN ('admin', 'superadmin')
          OR (school_id IS NOT NULL AND u.school_id = school_id)
        )
    )
  );

CREATE POLICY "documents_write_scoped_update" ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role IN ('admin', 'superadmin')
          OR owner_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role IN ('admin', 'superadmin')
          OR owner_user_id = auth.uid()
        )
        AND (
          u.role IN ('admin', 'superadmin')
          OR (school_id IS NOT NULL AND u.school_id = school_id)
        )
    )
  );

CREATE POLICY "documents_write_scoped_delete" ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role IN ('admin', 'superadmin')
          OR owner_user_id = auth.uid()
        )
    )
  );

COMMIT;
