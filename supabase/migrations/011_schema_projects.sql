 -- Migration 011: Pedagogical Projects + Teacher RAG Context (Supabase)

CREATE TABLE IF NOT EXISTS proyectos_pedagogicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,

  titulo TEXT NOT NULL,
  tema TEXT NOT NULL,
  descripcion TEXT,
  objetivos TEXT,
  evidencias_requeridas TEXT,
  criterios_evaluacion TEXT,

  fecha_inicio DATE,
  fecha_fin DATE,

  status TEXT NOT NULL DEFAULT 'planificacion'
    CHECK (status IN ('planificacion', 'ejecucion', 'evaluacion', 'completado', 'pausado')),
  progreso INTEGER NOT NULL DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),

  materias TEXT[] DEFAULT '{}',
  documentos_ids UUID[] DEFAULT '{}',
  alumnos_asignados TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_user ON proyectos_pedagogicos(user_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_school ON proyectos_pedagogicos(school_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_status ON proyectos_pedagogicos(status);

CREATE TABLE IF NOT EXISTS teacher_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  content TEXT,
  content_summary TEXT,
  document_type TEXT NOT NULL DEFAULT 'otro'
    CHECK (document_type IN ('planeacion', 'proyecto', 'actividad', 'reglamento', 'recurso', 'otro')),

  file_path TEXT,
  file_url TEXT,
  mime_type TEXT,

  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  chunks_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_docs_user ON teacher_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_docs_school ON teacher_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_docs_type ON teacher_documents(document_type);

CREATE TABLE IF NOT EXISTS teacher_doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES teacher_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_vector TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON teacher_doc_chunks(document_id);

CREATE TABLE IF NOT EXISTS rag_context_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT,
  context_used JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_logs_user ON rag_context_logs(user_id);

ALTER TABLE proyectos_pedagogicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_scoped" ON proyectos_pedagogicos;
DROP POLICY IF EXISTS "projects_insert_scoped" ON proyectos_pedagogicos;
DROP POLICY IF EXISTS "projects_update_scoped" ON proyectos_pedagogicos;
DROP POLICY IF EXISTS "projects_delete_scoped" ON proyectos_pedagogicos;

CREATE POLICY "projects_select_scoped" ON proyectos_pedagogicos FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "projects_insert_scoped" ON proyectos_pedagogicos FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_scoped" ON proyectos_pedagogicos FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete_scoped" ON proyectos_pedagogicos FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "teacher_docs_select_scoped" ON teacher_documents;
DROP POLICY IF EXISTS "teacher_docs_insert_scoped" ON teacher_documents;
DROP POLICY IF EXISTS "teacher_docs_update_scoped" ON teacher_documents;
DROP POLICY IF EXISTS "teacher_docs_delete_scoped" ON teacher_documents;

CREATE POLICY "teacher_docs_select_scoped" ON teacher_documents FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "teacher_docs_insert_scoped" ON teacher_documents FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "teacher_docs_update_scoped" ON teacher_documents FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "teacher_docs_delete_scoped" ON teacher_documents FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "teacher_chunks_select_scoped" ON teacher_doc_chunks;

CREATE POLICY "teacher_chunks_select_scoped" ON teacher_doc_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM teacher_documents d
    WHERE d.id = teacher_doc_chunks.document_id
      AND d.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "rag_logs_select_scoped" ON rag_context_logs;
DROP POLICY IF EXISTS "rag_logs_insert_scoped" ON rag_context_logs;

CREATE POLICY "rag_logs_select_scoped" ON rag_context_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "rag_logs_insert_scoped" ON rag_context_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE VIEW v_user_context AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  s.name AS school_name,
  s.cct AS school_cct,
  COALESCE(p.total_proyectos, 0) AS total_proyectos,
  COALESCE(d.total_documentos, 0) AS total_documentos,
  COALESCE(c.total_chunks, 0) AS total_chunks
FROM users u
LEFT JOIN schools s ON s.id = u.school_id
LEFT JOIN (
  SELECT user_id, COUNT(*)::INT AS total_proyectos
  FROM proyectos_pedagogicos
  GROUP BY user_id
) p ON p.user_id = u.id
LEFT JOIN (
  SELECT user_id, COUNT(*)::INT AS total_documentos
  FROM teacher_documents
  GROUP BY user_id
) d ON d.user_id = u.id
LEFT JOIN (
  SELECT td.user_id, COUNT(c.id)::INT AS total_chunks
  FROM teacher_documents td
  LEFT JOIN teacher_doc_chunks c ON c.document_id = td.id
  GROUP BY td.user_id
) c ON c.user_id = u.id;