-- Migration 008: Indexes
-- Performance indexes for frequent queries and pgvector semantic search.

-- pgvector index for semantic similarity search
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Frequent query indexes
CREATE INDEX idx_calendar_entries_date ON calendar_entries (teacher_calendar_id, date);
CREATE INDEX idx_daily_logs_user_date ON daily_logs (user_id, date);
CREATE INDEX idx_attendance_user_date ON attendance_records (user_id, date);
CREATE INDEX idx_academic_projects_field ON academic_projects (field_id, trimester);
CREATE INDEX idx_pedagogical_alerts_user ON pedagogical_alerts (user_id, resolved_at);
CREATE INDEX idx_document_chunks_document ON document_chunks (document_id, chunk_index);
