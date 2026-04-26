-- Migration 010: RLS baseline for sensitive domains (ADR-002)

-- users: solo propio perfil
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_profile" ON users FOR ALL
  USING (auth.uid() = id);

-- daily_logs: solo propios
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_logs" ON daily_logs FOR ALL
  USING (auth.uid() = user_id);

-- attendance_records: solo propios
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_attendance" ON attendance_records FOR ALL
  USING (auth.uid() = user_id);

-- evaluation_records: solo propios
ALTER TABLE evaluation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_evaluations" ON evaluation_records FOR ALL
  USING (auth.uid() = user_id);

-- pedagogical_alerts: solo propias
ALTER TABLE pedagogical_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher_own_alerts" ON pedagogical_alerts FOR ALL
  USING (auth.uid() = user_id);

-- documents: lectura pública de escuela, escritura solo admin/superadmin
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

DROP POLICY IF EXISTS "documents_read_authenticated" ON documents;
DROP POLICY IF EXISTS "documents_read_scoped" ON documents;
DROP POLICY IF EXISTS "documents_write_admin_insert" ON documents;
DROP POLICY IF EXISTS "documents_write_admin_update" ON documents;
DROP POLICY IF EXISTS "documents_write_admin_delete" ON documents;

CREATE POLICY "documents_read_scoped" ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND (
          u.role IN ('admin', 'superadmin')
          OR owner_user_id = auth.uid()
          OR (school_id IS NOT NULL AND u.school_id = school_id)
        )
    )
  );

CREATE POLICY "documents_write_admin_insert" ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "documents_write_admin_update" ON documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "documents_write_admin_delete" ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
  );
