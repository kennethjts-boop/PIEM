-- Migration 003: Structured Curriculum

CREATE TABLE curriculum_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,          -- ej. "Lenguajes", "Matemáticas"
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE curriculum_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES curriculum_fields(id),
  phase_number INTEGER NOT NULL,  -- 1-6
  grade_range TEXT NOT NULL,       -- ej. "7-9"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE academic_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES curriculum_fields(id),
  phase_id UUID REFERENCES curriculum_phases(id),
  trimester INTEGER NOT NULL CHECK (trimester BETWEEN 1 AND 3),
  sequence_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  suggested_days INTEGER NOT NULL DEFAULT 10,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_flexible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE partial_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  suggested_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pda_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES curriculum_fields(id),
  code TEXT NOT NULL,          -- ej. "L1.1", "M3.4"
  description TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_pda_links (
  project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  pda_id UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  relevance_score NUMERIC(3,2) DEFAULT 1.0 CHECK (relevance_score BETWEEN 0 AND 1),
  PRIMARY KEY (project_id, pda_id)
);

CREATE TABLE project_dependencies (
  project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  depends_on_project_id UUID REFERENCES academic_projects(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, depends_on_project_id)
);
