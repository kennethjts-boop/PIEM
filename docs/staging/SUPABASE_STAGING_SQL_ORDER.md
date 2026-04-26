# Supabase Staging SQL Order (Pilot Profeia)

## Causa del error `relation "users" does not exist`
`010_rls_baseline.sql` asume que ya existen tablas base (`users`, `daily_logs`, `attendance_records`, `evaluation_records`, `pedagogical_alerts`, `documents`).

Si se ejecuta `010` primero, falla en la primera línea que toca `users`.

---

## Opción recomendada (usar migraciones existentes en orden)

En Supabase SQL Editor, aplica **en este orden exacto**:

1. `supabase/migrations/001_enable_pgvector.sql`
2. `supabase/migrations/002_schema_users.sql`  ← crea `users` y `schools`
3. `supabase/migrations/003_schema_curriculum.sql`
4. `supabase/migrations/004_schema_calendar.sql`
5. `supabase/migrations/005_schema_codesign.sql`
6. `supabase/migrations/006_schema_context.sql` ← crea `daily_logs`, `attendance_records`, `evaluation_records`, `pedagogical_alerts`
7. `supabase/migrations/007_schema_rag.sql` ← crea `documents`
8. `supabase/migrations/008_indexes.sql`
9. `supabase/migrations/010_rls_baseline.sql`

### Sobre `009_rls_users_teacher_baseline.sql`
- **Omitir 009** si vas a ejecutar `010`.
- `010` ya cubre RLS de `users` y además agrega RLS para context/documentos.

---

## Qué NO debes aplicar

- **NO aplicar `010_rls_baseline.sql` sola** en una base vacía.
- **NO aplicar `009` y `010` juntos** en staging nuevo (es redundante y confuso en auditoría de policies).

---

## ¿010 necesita ajustes?
No para este error específico. El error se corrige aplicando primero las migraciones de esquema que crean las tablas base.

---

## Cómo verificar que `users` existe antes de 010

Ejecuta en SQL Editor:

```sql
select to_regclass('public.users') as users_table;
```

Debe devolver: `public.users`.

También puedes verificar las tablas críticas:

```sql
select to_regclass('public.daily_logs') as daily_logs,
       to_regclass('public.attendance_records') as attendance_records,
       to_regclass('public.evaluation_records') as evaluation_records,
       to_regclass('public.pedagogical_alerts') as pedagogical_alerts,
       to_regclass('public.documents') as documents;
```

---

## Opción alternativa (SQL único consolidado)
Si quieres evitar aplicar 10 archivos manualmente, usa:

- `supabase/staging/000_staging_bootstrap_pilot.sql`

Este script crea lo mínimo del piloto en forma idempotente (tablas y RLS base) para staging.

**Importante:** si usas el bootstrap consolidado, no vuelvas a correr encima `002/006/007/010` en la misma base sin revisar, para evitar drift de esquema/policies.
