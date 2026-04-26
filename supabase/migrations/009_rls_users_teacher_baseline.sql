-- Migration 009: users RLS baseline for teacher profile isolation

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"
ON users
FOR ALL
USING (auth.uid() = id);
