# ADR-001: Canonicidad de Stack Arquitectónico en Profeia

- **Estado:** Aprobado
- **Fecha:** 2026-04-25
- **Decisores:** MOLIE
- **Ámbito:** Arquitectura de plataforma (frontend, backend, datos, despliegue, seguridad, roadmap IA)
- **Tags:** brownfield, arquitectura, transición, supabase, local-first, ia

---

## 1) Contexto brownfield

El repositorio de Profeia presenta actualmente dos líneas arquitectónicas en paralelo:

- **Línea A (objetivo):**
  - `apps/web` (Next.js)
  - `apps/api` (FastAPI)
  - `supabase/` (Postgres + pgvector)
- **Línea B (producto funcional actual):**
  - `profeia/client` (Vite + React dashboard)
  - `profeia/server` (Express + SQLite)

Esta convivencia permitió avanzar rápidamente en producto y experiencia docente, pero también introdujo duplicidad tecnológica, divergencia de despliegue y deuda de integración entre autenticación, datos y seguridad.

---

## 2) Problema arquitectónico actual

La coexistencia de dos stacks sin una decisión formal de canonicidad genera:

1. **Ambigüedad de dirección técnica** (qué stack priorizar para nuevas features).
2. **Duplicación de esfuerzo** en frontend/backend y contratos de datos.
3. **Riesgos de seguridad y gobernanza** por diferencias de auth, RLS y manejo de datos.
4. **Complejidad operativa en despliegue** (Vercel y servicios no alineados).
5. **Dificultad para evolucionar IA/RAG** de forma consistente en producción.

---

## 3) Decisión oficial

Se adopta la siguiente decisión de arquitectura:

### 3.1 Stack canónico oficial (target de producto)

- `apps/web`
- `apps/api`
- `supabase`

Este stack es el **único destino canónico** para:

- funcionalidades nuevas de producción,
- endurecimiento de seguridad,
- escalamiento multi-tenant,
- integración formal de IA/RAG en nube,
- operación estándar y observabilidad.

### 3.2 Stack transitorio estratégico

- `profeia/client`
- `profeia/server`

Este stack **no se depreca de inmediato**, sino que se mantiene con propósito explícito:

- modo **local-first docente**,
- capacidad **offline-first experimental**,
- **bridge** hacia RAG local futuro,
- baja latencia en telesecundarias,
- base para **EVA classroom runtime local**.

### 3.3 Regla de gobernanza

Toda nueva iniciativa debe clasificarse en una de dos categorías:

1. **Canónica (default):** implementar en `apps/* + supabase`.
2. **Transitoria estratégica (excepción justificada):** implementar en `profeia/*` únicamente si el caso requiere local/offline o experimentación de runtime local.

---

## 4) Alternativas consideradas

### A) Mantener dualidad sin decisión formal

- **Pros:** flexibilidad inmediata.
- **Contras:** perpetúa drift arquitectónico, mayor costo total, menor trazabilidad.
- **Resultado:** descartada.

### B) Migrar todo de forma inmediata y apagar `profeia/*`

- **Pros:** simplificación rápida del landscape.
- **Contras:** riesgo alto para operación docente local, pérdida de capacidades offline/latencia baja.
- **Resultado:** descartada.

### C) Declarar `profeia/*` como canónico y relegar `apps/*`

- **Pros:** aprovecha producto actual funcional.
- **Contras:** limita evolución cloud-native, seguridad/RLS y roadmap IA en Supabase.
- **Resultado:** descartada.

### D) Decisión adoptada (canónico + transitorio estratégico)

- **Pros:** dirección clara sin perder capacidades locales.
- **Contras:** requiere disciplina de gobernanza y plan de transición.
- **Resultado:** aprobada.

---

## 5) Consecuencias positivas

1. **Dirección técnica única** para producto enterprise (`apps/* + supabase`).
2. **Mejor seguridad por diseño** al centralizar auth, políticas de datos y trazabilidad.
3. **Reducción progresiva de deuda brownfield** con estrategia explícita de transición.
4. **Preservación de capacidades docentes locales** de alto valor (offline/latencia).
5. **Aceleración del roadmap IA** al separar claramente runtime cloud y runtime local.

---

## 6) Riesgos

1. **Riesgo de doble mantenimiento prolongado** si no se controla alcance transitorio.
2. **Riesgo de dependencia al stack transitorio** por presión operativa de corto plazo.
3. **Riesgo de inconsistencia funcional** entre experiencias cloud y local.
4. **Riesgo de seguridad diferencial** si el stack transitorio no adopta baseline mínimo.
5. **Riesgo de retraso en migración** por falta de hitos y ownership.

### Mitigaciones mínimas

- Comité de arquitectura mensual con revisión de excepciones.
- Definición de SLA de transición por módulo.
- Checklist de seguridad obligatorio para ambos stacks.
- Métricas de avance de convergencia (porcentaje de features en stack canónico).

---

## 7) Estrategia de transición

### 7.1 Principios

- **Canon-first:** toda feature nueva nace en stack canónico salvo excepción aprobada.
- **No big-bang:** migración por dominios funcionales.
- **Compatibilidad temporal:** mantener interfaces puente mientras conviven ambos stacks.
- **Seguridad transversal:** baseline común en auth, secretos, logging y hardening.

### 7.2 Enfoque por dominios

1. **Autenticación y autorización**
   - Unificar identidad en Supabase Auth.
   - Definir claims/roles estándar reutilizables por ambos runtimes.

2. **Datos y contratos**
   - Establecer Supabase como fuente de verdad canónica para cloud.
   - Definir mapeos explícitos SQLite <-> Postgres para modo local.

3. **RAG y documentos**
   - Cloud RAG en Supabase/pgvector como ruta principal.
   - Runtime local como vía complementaria para escenarios de baja conectividad.

4. **Frontend y experiencia**
   - Evolucionar UX oficial en `apps/web`.
   - Mantener `profeia/client` como canal local/experimental con alcance controlado.

### 7.3 Criterios de salida del stack transitorio

Un módulo se considera migrado cuando:

- existe implementación funcional en stack canónico,
- tiene observabilidad y seguridad baseline,
- se valida paridad funcional mínima con necesidades docentes,
- se desactiva su evolución en `profeia/*` salvo mantenimiento correctivo local.

---

## 8) Timeline sugerido

> Horizonte sugerido: 2 trimestres (ajustable por capacidad del equipo)

### Trimestre 1

- Formalizar contratos de dominio y ownership por módulo.
- Cerrar baseline de seguridad/auth y políticas de datos.
- Priorizar migración canónica de módulos críticos (auth, dashboard core, documentos base).
- Definir y pilotear bridge local-cloud para operación docente.

### Trimestre 2

- Consolidar roadmap IA/RAG en stack canónico.
- Limitar `profeia/*` a capacidades locales estratégicas (offline/runtime EVA).
- Completar primera ola de convergencia funcional.
- Publicar ADR de seguimiento (ADR-00X de transición fase 2).

---

## 9) Impacto en despliegue Vercel

1. **Producción web oficial** debe alinearse al stack canónico (`apps/web`).
2. Configuración de build/deploy debe evitar ambigüedad entre `apps/web` y `profeia/client`.
3. `profeia/client` se mantiene para entornos de prueba/local-first, no como front canónico de producto.
4. Se recomienda separar explícitamente:
   - proyecto Vercel canónico,
   - entornos de experimentación transitoria.

---

## 10) Impacto en Supabase

1. Supabase se confirma como **plataforma de datos canónica** para la línea cloud.
2. `supabase/migrations` pasa a ser fuente oficial de evolución de esquema.
3. Se prioriza cierre de brechas de RLS, políticas por rol y aislamiento de datos.
4. Componentes IA/RAG cloud se acoplan a Postgres + pgvector como estándar.
5. Integraciones locales (`profeia/server`) deben diseñarse como capa complementaria, no sustituta.

---

## 11) Impacto en seguridad

1. La decisión permite centralizar estrategia de seguridad en stack canónico.
2. Se requiere baseline mínimo obligatorio para ambos stacks:
   - gestión de secretos,
   - CORS restringido por entorno,
   - autenticación fuerte,
   - autorización por rol,
   - auditoría de eventos críticos.
3. El stack transitorio no queda exento de controles; se clasifica como superficie activa de riesgo.
4. Debe existir matriz de cumplimiento por módulo (canónico vs transitorio).

---

## 12) Impacto en roadmap IA

1. **Ruta principal IA (cloud):**
   - orquestación en `apps/api`,
   - almacenamiento y retrieval en Supabase/pgvector,
   - trazabilidad y observabilidad centralizadas.

2. **Ruta complementaria IA (local):**
   - experimentación offline-first,
   - latencia ultra-baja para aula,
   - bridge para RAG local futuro,
   - base de EVA classroom runtime local.

3. **Regla de priorización IA:**
   - capacidades núcleo, escalables y auditables -> stack canónico,
   - capacidades de resiliencia local/offline -> stack transitorio estratégico.

---

## Anexos

### A. Alcance explícito de ADR-001

Este ADR define **canonicidad de stack y convivencia transitoria**. No define en detalle:

- diseño de políticas RLS por tabla,
- arquitectura final de microservicios,
- selección final de modelos IA locales.

### B. Próximos ADR sugeridos

- **ADR-002:** AuthN/AuthZ + RLS baseline transversal.
- **ADR-003:** Estrategia de convergencia de datos (SQLite local <-> Supabase).
- **ADR-004:** Arquitectura IA híbrida (cloud + local runtime EVA).
