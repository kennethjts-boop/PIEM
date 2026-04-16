-- Migration 005: Codesign
-- Also adds the FK from calendar_entries.codesign_id now that codesigns exists.

CREATE TABLE codesigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cultural_trigger TEXT,
  pda_justification TEXT,
  suggested_days INTEGER NOT NULL DEFAULT 5,
  created_by TEXT NOT NULL DEFAULT 'teacher',  -- 'teacher' | 'ai'
  status TEXT NOT NULL DEFAULT 'draft',        -- 'draft' | 'active' | 'archived'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE codesign_pda_links (
  codesign_id UUID REFERENCES codesigns(id) ON DELETE CASCADE,
  pda_id UUID REFERENCES pda_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (codesign_id, pda_id)
);

-- Add FK that was deferred in migration 004 until codesigns existed
ALTER TABLE calendar_entries
  ADD CONSTRAINT fk_calendar_entries_codesign
  FOREIGN KEY (codesign_id) REFERENCES codesigns(id);
