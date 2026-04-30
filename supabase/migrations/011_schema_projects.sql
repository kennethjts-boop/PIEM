-- Migration 011: Pedagogical Projects Table
-- Projects are central entities for organizing pedagogical work

CREATE TABLE IF NOT EXISTS proyectos_pedagogicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  
  -- Basic info
  titulo TEXT NOT NULL,
  tema TEXT NOT NULL,
  descripcion TEXT,
  
  -- Pedagogical structure
  objetivos TEXT,
  evidencias_requeridas TEXT,
  criterios_evaluacion TEXT,
  
  -- Temporal organization
  fecha_inicio DATE,
  fecha_fin DATE,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'planificacion' 
    CHECK (status IN ('planificacion', 'ejecucion', 'evaluacion', 'completado', 'pausado')),
  
  -- Progress tracking
  progreso INTEGER DEFAULT 0 CHECK (progreso BETWEEN 0 AND 100),
  
  -- Related data (JSON arrays)
  materias TEXT,           -- JSON array of subjects involved
  documentos_ids TEXT,       -- JSON array of related document IDs
  alumnos_asignados TEXT,    -- JSON array of assigned student names
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_proyectos_docente ON proyectos_pedagogicos(docente_id);
CREATE INDEX IF NOT EXISTS idx_proyectos_status ON proyectos_pedagogicos(status);
CREATE INDEX IF NOT EXISTS idx_proyectos_tema ON proyectos_pedagogicos(tema);

-- Simple documents table for teacher documents (if not exists from 007)
-- This is a simplified version focused on teacher-created documents
CREATE TABLE IF NOT EXISTS teacher_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  docente_id INTEGER NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  content TEXT,                -- Extracted text content
  content_summary TEXT,        -- AI-generated summary
  document_type TEXT NOT NULL DEFAULT 'otro'
    CHECK (document_type IN ('planeacion', 'proyecto', 'actividad', 'reglamento', 'recurso', 'otro')),
  
  -- Source info
  file_path TEXT,
  file_url TEXT,
  mime_type TEXT,
  
  -- RAG fields
  processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'error')),
  chunks_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teacher_docs_docente ON teacher_documents(docente_id);
CREATE INDEX IF NOT EXISTS idx_teacher_docs_type ON teacher_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_teacher_docs_status ON teacher_documents(processing_status);

-- Document chunks for basic RAG
CREATE TABLE IF NOT EXISTS teacher_doc_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES teacher_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_vector TEXT,         -- JSON array of embedding (for simple storage)
  metadata TEXT,               -- JSON with page, section, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON teacher_doc_chunks(document_id);

-- View for easy RAG context retrieval
CREATE VIEW IF NOT EXISTS v_docente_context AS
SELECT 
  d.id as docente_id,
  d.nombre as docente_nombre,
  d.escuela as escuela_nombre,
  d.clave_escuela,
  COUNT(DISTINCT p.id) as total_planeaciones,
  COUNT(DISTINCT b.id) as total_bitacoras,
  COUNT(DISTINCT proj.id) as total_proyectos,
  COUNT(DISTINCT td.id) as total_documentos
FROM docentes d
LEFT JOIN planeaciones p ON d.id = p.docente_id
LEFT JOIN bitacora b ON d.id = b.docente_id
LEFT JOIN proyectos_pedagogicos proj ON d.id = proj.docente_id
LEFT JOIN teacher_documents td ON d.id = td.docente_id
GROUP BY d.id;
