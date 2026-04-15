-- ============================================================
-- ProfeIA — Supabase Production Schema
-- PostgreSQL 15 + pgvector
-- ============================================================
-- Embedding model: text-embedding-v2 (Alibaba / Dashscope)
-- Dimensions: 1536
-- Cosine similarity recommended for semantic search
-- ============================================================

-- Enable pgvector extension (run as superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- DOMAIN: Schools & Users
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  cct        TEXT UNIQUE,
  zone       TEXT,
  state      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  role       TEXT DEFAULT 'teacher',
  grade      INT,
  group_label TEXT,
  genero     TEXT DEFAULT 'maestro',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  academic_context     TEXT,
  group_strengths      TEXT,
  group_challenges     TEXT,
  estimated_pace       TEXT DEFAULT 'normal',
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOMAIN: Structured Curriculum (NEM)
-- ============================================================

CREATE TABLE IF NOT EXISTS curriculum_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curriculum_phases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id     UUID REFERENCES curriculum_fields(id) ON DELETE CASCADE,
  phase_number INT NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  grade_range  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id        UUID REFERENCES curriculum_fields(id),
  phase_id        UUID REFERENCES curriculum_phases(id),
  trimester       INT CHECK (trimester BETWEEN 1 AND 3),
  sequence_number INT,
  name            TEXT NOT NULL,
  description     TEXT,
  suggested_days  INT,
  priority        INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_flexible     BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partial_projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  sequence_order      INT,
  suggested_days      INT
);

CREATE TABLE IF NOT EXISTS pda_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id    UUID REFERENCES curriculum_fields(id),
  code        TEXT,
  description TEXT NOT NULL,
  level       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_pda_links (
  project_id      UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  pda_id          UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  relevance_score NUMERIC(3,2) DEFAULT 1.0,
  PRIMARY KEY (project_id, pda_id)
);

CREATE TABLE IF NOT EXISTS project_dependencies (
  project_id             UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  depends_on_project_id  UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, depends_on_project_id)
);

-- ============================================================
-- DOMAIN: Calendar
-- ============================================================

CREATE TABLE IF NOT EXISTS school_years (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  total_working_days INT,
  label             TEXT
);

CREATE TABLE IF NOT EXISTS school_calendar_days (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID REFERENCES school_years(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('working','holiday','suspension','event')),
  label          TEXT,
  UNIQUE (school_year_id, date)
);

CREATE TABLE IF NOT EXISTS teacher_calendars (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES school_years(id),
  generated_at   TIMESTAMPTZ DEFAULT now(),
  version        INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  entry_type          TEXT NOT NULL CHECK (entry_type IN (
                        'academic_project','codesign','extracurricular','recovery','buffer')),
  academic_project_id UUID REFERENCES academic_projects(id),
  codesign_id         UUID,
  time_start          TIME,
  time_end            TIME,
  status              TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','skipped','rescheduled')),
  notes               TEXT
);

CREATE TABLE IF NOT EXISTS calendar_adjustments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_calendar_id UUID REFERENCES teacher_calendars(id) ON DELETE CASCADE,
  triggered_at        TIMESTAMPTZ DEFAULT now(),
  reason              TEXT,
  affected_entries_count INT,
  adjustment_type     TEXT CHECK (adjustment_type IN ('shift','compress','drop','codesign_insert')),
  impact_summary      TEXT
);

-- ============================================================
-- DOMAIN: Codiseño
-- ============================================================

CREATE TABLE IF NOT EXISTS codesigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  cultural_trigger  TEXT,
  pda_justification TEXT,
  suggested_days    INT,
  created_by        TEXT DEFAULT 'teacher' CHECK (created_by IN ('teacher','ai')),
  status            TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calendar_entries
  ADD CONSTRAINT fk_codesign
  FOREIGN KEY (codesign_id) REFERENCES codesigns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS codesign_pda_links (
  codesign_id UUID REFERENCES codesigns(id) ON DELETE CASCADE,
  pda_id      UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (codesign_id, pda_id)
);

-- ============================================================
-- DOMAIN: Live Teaching Context
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  date                  DATE NOT NULL,
  narrative             TEXT,
  advances              TEXT,
  difficulties          TEXT,
  participation_level   INT CHECK (participation_level BETWEEN 1 AND 5),
  behavior_notes        TEXT,
  group_needs           TEXT,
  ideas_for_tomorrow    TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  total_students  INT,
  present         INT,
  absent_ids      UUID[],
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS evaluation_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id  UUID,
  date        DATE NOT NULL,
  criteria    TEXT,
  score       NUMERIC(5,2),
  observation TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interest_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  detected_at  TIMESTAMPTZ DEFAULT now(),
  signal_type  TEXT CHECK (signal_type IN ('cultural','topic','trend','teacher_note')),
  description  TEXT NOT NULL,
  strength     INT DEFAULT 3 CHECK (strength BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS pedagogical_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  alert_type      TEXT CHECK (alert_type IN ('rezago','interest_spike','pace_risk','coverage_risk')),
  severity        TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  message         TEXT NOT NULL,
  suggested_action TEXT,
  resolved        BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- DOMAIN: RAG — Document Store with pgvector
-- ============================================================
-- Embedding model: Alibaba text-embedding-v2
-- API: DashScope (https://dashscope.aliyuncs.com)
-- Endpoint: POST /api/v1/services/embeddings/text-embedding/text-embedding
-- Dimensions: 1536 (fixed for text-embedding-v2)
-- Similarity metric: cosine
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  source_type       TEXT CHECK (source_type IN (
                      'libro_proyectos','pda','recurso','ley','norma','plan_estudio','otro')),
  field_id          UUID REFERENCES curriculum_fields(id),
  grade             INT,
  trimester         INT,
  file_path         TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
                      'pending','processing','completed','error')),
  uploaded_by       UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID REFERENCES documents(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  chunk_index    INT,
  page_number    INT,
  section_title  TEXT,
  metadata       JSONB DEFAULT '{}',
  -- Embedding: Alibaba text-embedding-v2, 1536 dimensions
  embedding      vector(1536),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index for approximate nearest neighbor (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_chunk_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS chunk_tags (
  chunk_id   UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  tag_type   TEXT CHECK (tag_type IN ('field','project','pda','grade','activity_type')),
  tag_value  TEXT,
  PRIMARY KEY (chunk_id, tag_type, tag_value)
);

CREATE TABLE IF NOT EXISTS retrieval_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id),
  query               TEXT NOT NULL,
  retrieved_chunk_ids UUID[],
  model_used          TEXT,
  response_summary    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (skeleton)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment and adapt when Supabase Auth is configured):
-- CREATE POLICY "users_own_data" ON teacher_calendars
--   FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- SEMANTIC SEARCH EXAMPLE QUERY
-- ============================================================
-- SELECT
--   dc.content,
--   dc.section_title,
--   d.title AS document_title,
--   1 - (dc.embedding <=> '[...your 1536-dim vector...]'::vector) AS similarity
-- FROM document_chunks dc
-- JOIN documents d ON dc.document_id = d.id
-- WHERE 1 - (dc.embedding <=> '[...vector...]'::vector) > 0.75
-- ORDER BY dc.embedding <=> '[...vector...]'::vector
-- LIMIT 5;
