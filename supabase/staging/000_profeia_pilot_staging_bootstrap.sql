-- Profeia Pilot Staging Bootstrap (single-run SQL for Supabase SQL Editor)
-- Idempotent and independent from previous migrations.

BEGIN;

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) USERS PROFILE TABLE REQUIRED BY FRONTEND AuthContext
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'teacher',
  school_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure required columns exist with expected shape (idempotent)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure users.id has FK to auth.users(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'public.users'::regclass
      AND confrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_users_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Keep updated_at current on profile updates
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_users_set_updated_at'
      AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER trg_users_set_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- Grants (safe to re-run)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_service_role_all" ON public.users;
CREATE POLICY "users_service_role_all"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2) DOCUMENTS (queried directly when VITE_DOCUMENTS_BACKEND=supabase)
--    Minimal shape compatible with client/src/api.js
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  file_path TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  school_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS owner_user_id UUID;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_documents_owner_created_at
  ON public.documents (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_school_created_at
  ON public.documents (school_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_read_scoped" ON public.documents;
CREATE POLICY "documents_read_scoped"
ON public.documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'superadmin')
        OR public.documents.owner_user_id = auth.uid()
        OR (
          public.documents.school_id IS NOT NULL
          AND u.school_id = public.documents.school_id
        )
      )
  )
);

DROP POLICY IF EXISTS "documents_insert_scoped" ON public.documents;
CREATE POLICY "documents_insert_scoped"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('teacher', 'director', 'admin', 'superadmin')
      AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
      AND (
        u.role IN ('admin', 'superadmin')
        OR (
          public.documents.school_id IS NOT NULL
          AND u.school_id = public.documents.school_id
        )
      )
  )
);

DROP POLICY IF EXISTS "documents_update_scoped" ON public.documents;
CREATE POLICY "documents_update_scoped"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'superadmin')
        OR public.documents.owner_user_id = auth.uid()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'superadmin')
        OR public.documents.owner_user_id = auth.uid()
      )
      AND (
        u.role IN ('admin', 'superadmin')
        OR (
          public.documents.school_id IS NOT NULL
          AND u.school_id = public.documents.school_id
        )
      )
  )
);

DROP POLICY IF EXISTS "documents_delete_scoped" ON public.documents;
CREATE POLICY "documents_delete_scoped"
ON public.documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'superadmin')
        OR public.documents.owner_user_id = auth.uid()
      )
  )
);

DROP POLICY IF EXISTS "documents_service_role_all" ON public.documents;
CREATE POLICY "documents_service_role_all"
ON public.documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

-- Force PostgREST to refresh metadata cache immediately
NOTIFY pgrst, 'reload schema';
