-- Migration 002: Users and Institution

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cct TEXT UNIQUE,          -- Clave de Centro de Trabajo SEP
  zone TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',  -- 'teacher' | 'admin'
  grade INTEGER,   -- 1, 2, 3 (grado de Telesecundaria)
  group_label TEXT,  -- ej. "A", "B"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  academic_context TEXT,       -- descripción libre del contexto inicial
  group_strengths TEXT,
  group_challenges TEXT,
  estimated_pace TEXT,         -- 'slow' | 'normal' | 'fast'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
