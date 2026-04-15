-- Migration 007: RAG Documentary
-- Requires pgvector enabled in migration 001.

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,   -- 'libro_proyectos' | 'pda' | 'recurso'
  field_id UUID REFERENCES curriculum_fields(id),
  grade INTEGER,
  trimester INTEGER CHECK (trimester BETWEEN 1 AND 3),
  file_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'completed' | 'error'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  section_title TEXT,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),      -- text-embedding-3-small / OpenAI compatible
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chunk_tags (
  chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL,      -- 'field' | 'project' | 'pda' | 'grade' | 'activity_type'
  tag_value TEXT NOT NULL,
  PRIMARY KEY (chunk_id, tag_type, tag_value)
);

CREATE TABLE retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  retrieved_chunk_ids UUID[],
  model_used TEXT,
  response_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
