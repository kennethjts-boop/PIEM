# ADR-002: AuthN/AuthZ + RLS Baseline Transversal en Profeia

- **Estado:** Aprobado
- **Fecha:** 2026-04-25
- **Decisores:** MOLIE
- **Ámbito:** Seguridad transversal (identidad, acceso, aislamiento de datos, auditoría)
- **Relacionado con:** ADR-001 (canonicidad de stack)
- **Tags:** authn, authz, rls, supabase, seguridad, brownfield, mvp

---

## 1) Contexto

Con ADR-001 aprobado, Profeia opera bajo dos líneas:

- **Stack canónico oficial:** `apps/web`, `apps/api`, `supabase`
- **Stack transitorio estratégico:** `profeia/client`, `profeia/server`

La plataforma requiere un marco uniforme de autenticación y autorización que funcione de forma consistente en ambos stacks, con Supabase como núcleo de identidad para el camino canónico y políticas de seguridad equivalentes para el camino transitorio.

---

## 2) Problema

Sin baseline formal de AuthN/AuthZ + RLS se generan:

1. Ambigüedad sobre quién puede ver/editar qué datos.
2. Riesgo de exposición cruzada entre docentes, escuelas y tenants.
3. Inconsistencia entre comportamiento cloud (canónico) y local/transitorio.
4. Dificultad para auditar acciones sensibles.
5. Bloqueo para escalar IA/RAG con trazabilidad y cumplimiento.

---

## 3) Decisión oficial

Se adopta la siguiente estrategia transversal:

1. **Supabase Auth** será la **fuente única de identidad** en el stack canónico.
2. **Autorización por rol + ámbito (scope)** se aplicará en:
   - backend (`apps/api`) para reglas de negocio,
   - base de datos (RLS) para aislamiento duro de filas.
3. **RLS es obligatoria** en dominios sensibles y activada por defecto (deny-by-default).
4. En stack transitorio (`profeia/*`) se aplicará baseline equivalente de control de acceso, aunque no sea RLS nativo.
5. Todo acceso a datos sensibles debe ser trazable vía `audit_logs`.

---

## 4) Modelo de roles

Roles MVP oficiales:

1. **teacher / profe**
   - Operación diaria de aula.
   - Alcance: grupos y alumnos asignados.
2. **director**
   - Supervisión pedagógica y operativa escolar.
   - Alcance: escuela completa.
3. **admin**
   - Operación administrativa de tenant/región asignada.
   - Alcance: múltiples escuelas bajo asignación explícita.
4. **superadmin**
   - Gobierno global de plataforma.
   - Alcance: total (cross-tenant).

---

## 5) Matriz inicial de permisos por rol

> Convención: **R** (read), **W** (write), **M** (manage/admin)

| Dominio            | teacher/profe | director | admin | superadmin |
|--------------------|---------------|----------|-------|------------|
| users/profiles     | R (propio + alumnos asignados limitados) / W (propio) | R (escuela) / W (metadatos escolares) | R/W (tenant/región) | M global |
| schools            | R (su escuela básica) | R/W (su escuela) | R/W (asignadas) | M global |
| classes/groups     | R/W (asignados) | R/W (escuela) | R/W (tenant/región) | M global |
| students           | R/W (asignados) | R/W (escuela) | R/W (tenant/región) | M global |
| documents          | R/W (propios o de sus grupos) | R/W (escuela) | R/W (tenant/región) | M global |
| rag_sources        | R (escuela/asignación) / W (si autorizado) | R/W (escuela) | R/W (tenant/región) | M global |
| rag_chunks         | R (vía retrieval policy) | R (escuela) | R (tenant/región) | M global |
| eva_observations   | R/W (propias y de sus grupos) | R/W (escuela) | R/W (tenant/región) | M global |
| suggestions        | R/W (generadas para su ámbito) | R/W (escuela) | R/W (tenant/región) | M global |
| audit_logs         | R (eventos propios limitados) | R (escuela) | R (tenant/región) | M global |

---

## 6) Supabase Auth como fuente de identidad

1. Todos los usuarios humanos del stack canónico autentican en Supabase Auth.
2. `auth.users.id` se vincula 1:1 con perfil de dominio (`users`).
3. Identidad técnica mínima:
   - `user_id` (UUID)
   - `role`
   - `school_id` (si aplica)
   - `tenant_id` / `region_id` (si aplica)
4. Prohibido usar identidad derivada solo de parámetros de cliente (ej. query/body sin validación JWT).
5. `apps/api` valida JWT en cada request protegida y aplica controles por rol/ámbito.

---

## 7) JWT claims recomendados

Claims mínimas recomendadas (además de estándar `sub`, `exp`, `iat`, etc.):

- `role`: `teacher` | `director` | `admin` | `superadmin`
- `tenant_id`: UUID (nullable para superadmin global, según diseño)
- `school_id`: UUID (nullable según rol)
- `region_id`: UUID o string (nullable)
- `group_ids`: UUID[] o IDs lógicos para asignaciones docentes
- `permissions_version`: entero para invalidar políticas por versión
- `is_service_account`: boolean (solo integraciones técnicas)
- `session_risk_level`: low/medium/high (opcional para hardening)

Reglas:

1. Claims deben derivarse del backend/identity store confiable, no del cliente.
2. Cambios de rol/asignación deben invalidar sesiones previas según política.
3. Service keys nunca deben exponerse al cliente.

---

## 8) RLS baseline por dominio

> Principio global: **deny all by default**, luego abrir por políticas explícitas.

## 8.1 users / profiles
- Teacher:
  - puede leer su propio perfil.
  - puede leer datos mínimos de alumnos/grupos asignados (mínimo necesario).
- Director:
  - lectura y actualización acotada de perfiles de su escuela.
- Admin:
  - lectura/escritura en tenant/región asignada.
- Superadmin:
  - acceso global.

## 8.2 schools
- Teacher: lectura básica de su escuela (metadatos no sensibles).
- Director: lectura/escritura de su escuela.
- Admin: lectura/escritura de escuelas asignadas.
- Superadmin: global.

## 8.3 classes / groups
- Teacher: solo grupos asignados.
- Director: todos los grupos de su escuela.
- Admin: grupos de escuelas dentro de su ámbito.
- Superadmin: global.

## 8.4 students
- Teacher: solo alumnos de sus grupos asignados.
- Director: todos los alumnos de su escuela.
- Admin: alumnos del tenant/región asignada.
- Superadmin: global.

## 8.5 documents
- Teacher: documentos propios o vinculados a sus grupos/escuela según tipo.
- Director: documentos de su escuela.
- Admin: documentos del tenant/región asignada.
- Superadmin: global.
- Recomendación: clasificación por sensibilidad (`public_school`, `restricted`, `confidential`).

## 8.6 rag_sources
- Teacher: lectura de fuentes autorizadas para su planeación.
- Director/Admin: gestión por ámbito.
- Superadmin: global.
- Toda fuente debe tener metadatos de pertenencia (`tenant_id`, `school_id`, `visibility_scope`).

## 8.7 rag_chunks
- Acceso indirecto y filtrado por pertenencia de `rag_sources`.
- Teacher no debe recuperar chunks fuera de su ámbito, incluso con query semántica.
- Policies de retrieval deben respetar tenant/school/group scope.

## 8.8 eva_observations
- Teacher: crea/lee/actualiza observaciones de su operación docente y alumnos asignados.
- Director: lectura y seguimiento de su escuela.
- Admin: lectura/escritura del ámbito asignado.
- Superadmin: global.
- Recomendación: campos sensibles con masking por rol cuando aplique.

## 8.9 suggestions
- Teacher: consume y gestiona sugerencias destinadas a su contexto.
- Director/Admin: visibilidad agregada por escuela/tenant.
- Superadmin: global.
- Asegurar trazabilidad de origen (IA/regla/manual) y destinatario.

## 8.10 audit_logs
- Inmutable (append-only) para actores no privilegiados.
- Teacher: solo eventos propios limitados.
- Director: eventos de su escuela.
- Admin: eventos de tenant/región.
- Superadmin: global.
- Ningún rol operativo debe borrar logs; retención según política de cumplimiento.

---

## 9) Reglas de aislamiento

1. **Teacher** solo ve/edita sus grupos, alumnos y documentos permitidos.
2. **Director** ve/gestiona exclusivamente su escuela.
3. **Admin** ve/gestiona tenant o región asignada explícitamente.
4. **Superadmin** acceso global controlado y auditado.
5. Nunca se permite cruce de tenant por error de join o falta de filtro.
6. Toda consulta sensible debe incluir scope derivado de claims, no de input libre.

---

## 10) Reglas para stack transitorio `profeia/*`

Mientras `profeia/*` siga activo como stack transitorio estratégico:

1. Debe implementar controles de acceso equivalentes por rol/ámbito.
2. No se permite “modo abierto” en ambientes con datos reales.
3. Cualquier sincronización con cloud debe:
   - autenticar actor,
   - firmar requests,
   - validar scope,
   - registrar auditoría.
4. Datos locales deben etiquetarse por ownership (`teacher_id`, `school_id`, `tenant_id`).
5. Si opera offline:
   - aplicar cifrado local donde sea viable,
   - sincronización con reconciliación segura,
   - resolución de conflictos auditada.
6. `profeia/*` no puede introducir un modelo de roles distinto al oficial MVP.

---

## 11) Riesgos

1. Drift de permisos entre canónico y transitorio.
2. Claims incompletos o inconsistentes en JWT.
3. Políticas RLS demasiado permisivas por excepción mal definida.
4. Fugas de datos en retrieval semántico (RAG) por filtros débiles.
5. Uso indebido de credenciales privilegiadas.
6. Falta de observabilidad de accesos críticos.

---

## 12) Mitigaciones

1. **Policy-as-code** versionada y revisada por arquitectura + seguridad.
2. **Tests de autorización** obligatorios por dominio y rol (happy + forbidden paths).
3. **Default deny** en tablas sensibles con apertura incremental.
4. **Security gates** en CI para cambios de auth/RLS.
5. Rotación y segregación de secretos (anon vs service role).
6. Auditoría obligatoria de operaciones sensibles (lectura masiva, exportación, cambios de rol).
7. Revisión trimestral de matriz de permisos y excepciones activas.

---

## 13) Criterios de aceptación

ADR-002 se considera implementable cuando:

1. Existe modelo de roles unificado en canónico y transitorio.
2. JWT claims mínimas están definidas y consumidas por backend.
3. RLS habilitada en todos los dominios listados (con políticas explícitas).
4. Pruebas de aislamiento por rol/tenant/escuela pasan consistentemente.
5. Consultas RAG respetan scopes sin fuga cross-tenant.
6. `audit_logs` registra eventos de authz críticos.
7. No existe endpoint productivo sensible sin validación de identidad y rol.

---

## 14) Próximos ADR sugeridos

1. **ADR-003:** Estrategia de convergencia de datos (local SQLite <-> Supabase).
2. **ADR-004:** Arquitectura IA híbrida (cloud + EVA runtime local).
3. **ADR-005:** Clasificación de datos, retención y cumplimiento (PII/educación).
4. **ADR-006:** Modelo de observabilidad y auditoría de seguridad extremo a extremo.
5. **ADR-007:** Estrategia de secretos y gestión de claves por ambiente.
