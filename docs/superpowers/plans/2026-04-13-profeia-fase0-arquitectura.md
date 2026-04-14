# ProfeIA — Fase 0: Arquitectura Técnica

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definir el modelo de datos, contrato de API y pipeline de ingestión de ProfeIA antes de escribir cualquier línea de código de producción.

**Architecture:** API monolítica modular (Next.js API routes ligeras + Python backend pesado) sobre Supabase (PostgreSQL + pgvector). Tres dominios internos: RAG documental, Currículo/Calendarización y Contexto Docente. Un solo origen de verdad en Supabase.

**Tech Stack:** Next.js 14, Python 3.11 (FastAPI), Supabase (PostgreSQL 15 + pgvector), Vercel, n8n (solo automatizaciones periféricas).

**Status:** FASE 0 — Solo diseño. NO implementar hasta recibir aprobación.

---

## BLOQUE 1 — Modelo de Datos en Supabase

### Dominio: Usuarios e Institución

| Tabla | Columnas clave | Notas |
|---|---|---|
| `schools` | id, name, cct, zone, state | Centro de trabajo |
| `users` | id, school_id, name, role, grade, group_label | Un maestro = una entidad única |
| `user_profiles` | user_id, academic_context, group_strengths, group_challenges, estimated_pace | Perfil pedagógico inicial del grupo |

---

### Dominio: Currículo Estructurado

> **Clave:** Los PDFs se convierten en estas tablas. No permanecen solo como documentos flotantes.

| Tabla | Columnas clave | Notas |
|---|---|---|
| `curriculum_fields` | id, name (ej. "Lenguajes"), description | Campo formativo NEM |
| `curriculum_phases` | id, field_id, phase_number, grade_range | Fase 1-6 |
| `academic_projects` | id, field_id, phase_id, trimester (1-3), sequence_number, name, description, suggested_days, priority, is_flexible | Los 45 proyectos de Lenguajes viven aquí |
| `partial_projects` | id, academic_project_id, name, sequence_order, suggested_days | Sub-unidades dentro de cada proyecto |
| `pda_catalog` | id, field_id, code, description, level | Procesos de Desarrollo de Aprendizaje |
| `project_pda_links` | project_id, pda_id, relevance_score | Relación muchos-a-muchos |
| `project_dependencies` | project_id, depends_on_project_id | Prerrequisitos curriculares |

---

### Dominio: Calendario

| Tabla | Columnas clave | Notas |
|---|---|---|
| `school_years` | id, start_date, end_date, total_working_days | Ciclo escolar oficial |
| `school_calendar_days` | id, school_year_id, date, type (working/holiday/suspension/event), label | Calendario SEP nacional |
| `teacher_calendars` | id, user_id, school_year_id, generated_at, version | Cada maestro tiene su propia instancia |
| `calendar_entries` | id, teacher_calendar_id, date, entry_type (academic_project/codesign/extracurricular/recovery/buffer), academic_project_id, codesign_id, time_start, time_end, status, notes | Cada celda del calendario del maestro |
| `calendar_adjustments` | id, teacher_calendar_id, triggered_at, reason, affected_entries_count, adjustment_type (shift/compress/drop/codesign_insert), impact_summary | Historial de cada reacomodo de la IA |

---

### Dominio: Codiseño

| Tabla | Columnas clave | Notas |
|---|---|---|
| `codesigns` | id, user_id, name, cultural_trigger, pda_justification, suggested_days, created_by (teacher/ai), status | Intervención pedagógica emergente |
| `codesign_pda_links` | codesign_id, pda_id | Justificación formal del codiseño |

---

### Dominio: Contexto Docente Vivo

| Tabla | Columnas clave | Notas |
|---|---|---|
| `daily_logs` | id, user_id, date, narrative, advances, difficulties, participation_level, behavior_notes, group_needs, ideas_for_tomorrow | Bitácora del día |
| `attendance_records` | id, user_id, date, total_students, present, absent_ids | Pase de lista |
| `evaluation_records` | id, user_id, student_id, date, criteria, score, observation | Evaluación continua |
| `interest_signals` | id, user_id, detected_at, signal_type (cultural/topic/trend/teacher_note), description, strength (1-5) | Señales de interés detectadas |
| `pedagogical_alerts` | id, user_id, created_at, alert_type (rezago/interest_spike/pace_risk/coverage_risk), severity, message, suggested_action | Alertas generadas por la IA |

---

### Dominio: RAG Documental

> **Estas tablas sí incluyen vectores (pgvector).**

| Tabla | Columnas clave | Tipo vector | Notas |
|---|---|---|---|
| `documents` | id, title, source_type (libro_proyectos/pda/recurso), field_id, grade, trimester, file_path, processing_status | — | Registro del PDF original |
| `document_chunks` | id, document_id, content, chunk_index, page_number, section_title, metadata JSONB, **embedding vector(1536)** | `vector(1536)` | Unidad mínima de búsqueda semántica |
| `chunk_tags` | chunk_id, tag_type (field/project/pda/grade/activity_type), tag_value | — | Etiquetado para filtros |
| `retrieval_logs` | id, user_id, query, retrieved_chunk_ids[], model_used, response_summary, created_at | — | Trazabilidad de cada consulta RAG |

**Índice requerido:** `CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);`

---

## BLOQUE 2 — Estructura de la API Única Modular

**Base URL:** `https://api.profeia.mx/v1`  
**Auth:** JWT via Supabase Auth en header `Authorization: Bearer <token>`  
**Formato:** JSON. Errores estándar `{ error: string, code: string }`.

---

### Módulo `/curriculum`

Gestiona el catálogo curricular estructurado (lectura predominante).

```
GET  /curriculum/fields
     → Lista de campos formativos con conteo de proyectos

GET  /curriculum/fields/:fieldId/projects?trimester=1&grade=2
     Payload: query params opcionales
     → Lista de academic_projects con duración, prioridad y PDA vinculados

GET  /curriculum/projects/:projectId
     → Proyecto completo con partial_projects, PDA y dependencias

GET  /curriculum/pda?field=lenguajes&search=comprensión
     → Búsqueda de PDA para justificar codiseños
```

---

### Módulo `/calendar`

El cerebro operativo del sistema.

```
POST /calendar/generate
     Body: { userId, schoolYearId, fieldId, contextNotes }
     → Genera teacher_calendar completo con calendar_entries distribuidas
     → Devuelve: { calendarId, totalEntries, distributionSummary }

GET  /calendar/month?userId=X&year=2025&month=11
     → Todas las calendar_entries del mes con estado e indicadores
     → Devuelve: { days: [{ date, entries: [...], indicators: [...] }] }

GET  /calendar/day/:date?userId=X
     → Detalle completo de una jornada: bloques 8am-2pm, planeación, bitácora, asistencia
     → Devuelve: { timeBlocks, activeEntry, dailyLog, attendance, alerts }

POST /calendar/day/mark-unavailable
     Body: { userId, date, reason }
     → Lanza motor de reajuste, devuelve opciones antes de aplicar
     → Devuelve: { options: [{ type: "shift"|"drop"|"compact", impact, preview }] }

POST /calendar/day/apply-adjustment
     Body: { userId, adjustmentOptionId, confirmedBy: "teacher" }
     → Aplica la opción elegida y guarda en calendar_adjustments
     → Devuelve: { adjustedEntries, impactSummary, coverageRisk }

POST /calendar/insert-codesign
     Body: { userId, date, codesignId, duration_days }
     → Inserta codiseño y recalcula entradas subsecuentes
     → Devuelve: { insertedEntry, displacedEntries, newCalendarSlice }

POST /calendar/recalculate
     Body: { userId, triggerType: "bitacora"|"attendance"|"manual", contextDelta }
     → Motor de re-scoring y reacomodo fino
     → Devuelve: { adjustmentsApplied, alertsGenerated, calendarVersion }
```

---

### Módulo `/context`

Captura y analiza el contexto vivo del docente.

```
POST /context/daily-log
     Body: { userId, date, narrative, advances, difficulties, participationLevel,
             behaviorNotes, groupNeeds, ideasForTomorrow }
     → Guarda bitácora, dispara análisis de señales, puede trigger /calendar/recalculate
     → Devuelve: { logId, detectedSignals, triggeredAlerts }

POST /context/attendance
     Body: { userId, date, presentStudentIds[], absentStudentIds[] }
     → Guarda asistencia, actualiza scoring de ritmo del grupo
     → Devuelve: { recordId, attendanceRate, paceImpact }

POST /context/evaluation
     Body: { userId, date, evaluations: [{ studentId, criteria, score, observation }] }
     → Guarda evaluación continua por alumno
     → Devuelve: { savedCount, groupAverages, riskStudents }

GET  /context/summary?userId=X&from=2025-09-01&to=2025-11-30
     → Resumen analítico del periodo: avance, alertas, intereses, ritmo real vs planificado
     → Devuelve: { progressRate, activeAlerts, topInterests, paceDeviation, coverageStatus }

POST /context/analyze
     Body: { userId }
     → Ejecuta análisis completo del contexto acumulado
     → Devuelve: { pedagogicalScores, priorityRecommendations, coverageRisk }
```

---

### Módulo `/rag`

Búsqueda semántica sobre el corpus documental.

```
POST /rag/query
     Body: { userId, query, filters: { fieldId?, grade?, trimester?, docType? }, topK: 5 }
     → Búsqueda semántica + filtros SQL híbridos
     → Devuelve: { chunks: [{ content, source, page, similarity, tags }], usedContext }

POST /rag/suggest-codesign
     Body: { userId, trigger: "dia_de_muertos"|"teacher_note", triggerDescription }
     → RAG sobre proyectos y PDA + contexto del grupo → propone codiseño justificado
     → Devuelve: { codesignProposal: { name, pda_justification, suggested_days,
                   relatedChunks, calendarImpact } }

POST /rag/justify-plan
     Body: { userId, date, planText }
     → Recupera fragmentos de libros que respaldan la planeación del día
     → Devuelve: { justifications: [{ pda, bookFragment, relevance }] }
```

---

### Módulo `/ai-decision`

Motor de decisión pedagógica central (invocado internamente y por el frontend).

```
POST /ai-decision/distribute-projects
     Body: { userId, fieldId, schoolYearId, initialContext }
     → Algoritmo de distribución inicial de proyectos en 185 días
     → Reglas duras (trimestres, dependencias) + scoring por contexto
     → Devuelve: { distributionPlan, coverageMap, flexibilityIndexes }

POST /ai-decision/score-project-priorities
     Body: { userId, fieldId }
     → Re-score de prioridades basado en bitácoras + asistencia + evaluación
     → Devuelve: { projectScores: [{ projectId, priorityScore, reason, action }] }

POST /ai-decision/suggest-next-action
     Body: { userId, date }
     → Analiza contexto del día y sugiere: continuar / reforzar / codiseño / recuperar
     → Devuelve: { suggestion, rationale, confidence, calendarImpact }

GET  /ai-decision/coverage-report?userId=X&trimester=1
     → Informe de cobertura curricular del trimestre
     → Devuelve: { projectsCovered, pdaAddressed, remainingDays,
                   riskLevel, recommendations }
```

---

## BLOQUE 3 — Pipeline de Ingestión de PDFs

El pipeline convierte documentos en conocimiento estructurado + buscable.

### Flujo general

```
PDF subido al storage de Supabase
        ↓
[1] TRIGGER (n8n o webhook POST /rag/ingest)
        ↓
[2] EXTRACCIÓN DE TEXTO
    - pdfplumber (texto nativo)
    - pytesseract + pdf2image (si es escaneado/OCR)
    - Limpieza: eliminar encabezados/pies repetidos, saltos de página artefactuales
        ↓
[3] DETECCIÓN DE ESTRUCTURA
    - Detectar títulos, subtítulos, actividades, proyectos, productos, PDA mencionados
    - Usar regex + pequeño clasificador para identificar tipo de sección
        ↓
[4] CHUNKING INTELIGENTE
    - Estrategia: chunk semántico por sección (no corte fijo de tokens)
    - Tamaño objetivo: 300-500 tokens por chunk con overlap de 50 tokens
    - Preservar: número de página, título de sección, referencia de libro
        ↓
[5] GENERACIÓN DE METADATOS POR CHUNK
    - field_id, grade, trimester, project_name si es identificable, pda_codes[]
    - Usar LLM pequeño (GPT-3.5 o Claude Haiku) para etiquetar en lote
        ↓
[6] GENERACIÓN DE EMBEDDINGS
    - Modelo: text-embedding-3-small (OpenAI) o equivalente
    - Batch de 100 chunks por llamada para eficiencia
        ↓
[7] GUARDADO EN SUPABASE
    - INSERT en document_chunks (content, embedding, metadata, chunk_tags)
    - UPDATE documents.processing_status → "completed"
        ↓
[8] ENLAZADO CURRICULAR
    - Intentar vincular chunks de proyectos detectados con academic_projects existentes
    - Si confianza > 0.85, crear relación automática; si no, encolar para revisión manual
        ↓
[9] NOTIFICACIÓN
    - n8n envía notificación al admin de que el documento está listo
    - Log en retrieval_logs con status de ingestión
```

### Roles de n8n en este pipeline

n8n **solo** actúa como disparador y notificador, nunca como procesador:

- Detecta archivo nuevo en storage → llama `POST /rag/ingest`
- Escucha webhook de fin de procesamiento → notifica por correo/Slack
- Job nocturno: re-score de prioridades vía `POST /ai-decision/score-project-priorities`
- Job semanal: generar informe de cobertura vía `GET /ai-decision/coverage-report`

---

## Decisiones de Arquitectura Clave

| Decisión | Elección | Razón |
|---|---|---|
| RAG vs. tablas | **Ambos** | RAG para búsqueda semántica libre; tablas para lógica curricular determinista |
| API Gateway | **No en Fase 1** | Una API modular es suficiente; gateway cuando haya escala real |
| Motor de decisiones | **Reglas + scoring + LLM** | LLM solo para lenguaje natural; las reglas curriculares son deterministas |
| Personalización | **Instancia por docente** | `teacher_calendars` es una entidad independiente por usuario |
| Codiseño | **Entidad de primer nivel** | No es un "extra"; tiene su propia tabla y ciclo de vida |
| Días inhábiles | **Opción explícita del maestro** | La IA propone opciones; el maestro decide; se guarda en `calendar_adjustments` |

---

## Estado: Esperando aprobación

Antes de generar cualquier código, confirmar:

- [ ] El modelo de datos cubre todas las entidades necesarias
- [ ] Los endpoints de `/calendar` tienen la granularidad correcta
- [ ] El pipeline de ingestión es viable con el stack elegido
- [ ] Las decisiones de arquitectura están alineadas con el producto

