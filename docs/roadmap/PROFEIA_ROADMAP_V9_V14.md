# ProfeIA Product Roadmap — V9 a V14

> Documento de roadmap técnico y de producto
> Estado: Planificación — No implementado
> Última actualización: 2026-04-30

---

## Visión General

Este roadmap describe la evolución de ProfeIA desde el piloto actual (V8) hasta la plataforma completa con app de padres/alumnos (V14).

Cada versión representa un hito de producto funcional, no solo una colección de features. El orden está diseñado para:
1. Validar tecnologías antes de invertir en infraestructura pesada
2. Generar valor de usuario en cada etapa
3. Mitigar riesgos técnicos y éticos progresivamente

---

## V9 — Data Intelligence Foundation

### Objetivo
Establecer las bases de datos para que ProfeIA "recuerde" y "entienda" el contexto pedagógico del docente.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **OCR Alumnos** | Importar listas de alumnos desde fotos o PDFs escaneados | Gemini Vision API |
| **Documentos Persistentes** | Almacenar documentos con metadata estructurada | Supabase Storage + PostgreSQL |
| **Importación por Foto** | Capturar lista de alumnos con cámara, extraer nombres, preview editable | Gemini Vision + normalización |
| **Documentos Accionables** | Cada documento puede generar: resumen, clase, actividad, evaluación | LLM prompts estructurados |
| **Mocks Demo Controlados** | Datos de demo para presentaciones sin exponer información real | Seeded datasets |
| **Normalización Nombres** | Detectar duplicados, corregir ortografía, estandarizar formatos | Fuzzy matching + reglas |

### Dependencias
- ✅ Supabase Storage (ya existe)
- ✅ Tabla `documents` (migración 007 existe)
- 🔧 Gemini Vision API key
- 🔧 OCR service backend (Edge Function)

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Precisión OCR baja | Alto | Preview editable obligatorio, confirmación docente |
| Costo Gemini Vision | Medio | Rate limiting, cache de resultados, tiered access |
| Datos inconsistentes | Medio | Validación estricta en frontend, normalización backend |
| Privacidad fotos | Alto | No almacenar fotos crudas, solo textos extraídos, consentimiento explícito |

### Qué NO hacer todavía
- ❌ No vector embeddings todavía (es V10)
- ❌ No chunking automático agresivo
- ❌ No procesamiento masivo sin supervisión
- ❌ No RAG conversacional completo

### Criterios de Éxito
- [ ] Docente puede importar lista de 30 alumnos desde foto en < 2 minutos
- [ ] Precisión OCR > 90% para nombres comunes latinoamericanos
- [ ] Preview editable permite corregir errores antes de guardar
- [ ] Documento subido puede generar 3+ acciones (resumen, clase, actividad)
- [ ] Mocks de demo no requieren datos reales de usuarios

---

## V10 — RAG Pedagógico Real

### Objetivo
ProfeIA "aprende" del docente: sus documentos, proyectos, estilo pedagógico. Chat con contexto real.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **Chunking Inteligente** | Dividir documentos en fragmentos semánticamente coherentes | LangChain / LlamaIndex |
| **Embeddings** | Vectores de texto para búsqueda semántica | OpenAI `text-embedding-3-small` o local |
| **Vector Search** | Buscar chunks relevantes dada una query del docente | pgvector (Supabase) o Pinecone |
| **RAG Docente** | Chat que consulta documentos del docente antes de responder | Retrieval-Augmented Generation |
| **Chat con Documentos** | "Qué dice el PDF de la SEP sobre evaluación?" | Context injection |
| **Proyectos Pedagógicos** | Nueva entidad central: proyectos con documentos, evidencias, metas | Tabla `projects` + relaciones |
| **Persistencia Pedagógica** | El agente "recuerda" preferencias del docente del tiempo | User context database |
| **Fuentes Citadas** | Cada respuesta RAG incluye referencia al documento fuente | Citation system |

### Dependencias
- ✅ V9 completado (documentos persistentes)
- 🔧 Extensión `pgvector` en Supabase
- 🔧 Edge Function para embeddings
- 🔧 Tablas: `document_chunks`, `embeddings`

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Latencia vector search | Medio | Índices HNSW, caching, queries optimizadas |
| Costo embeddings | Medio | Batch processing, embeddings locales opcional |
| Contexto excede tokens | Alto | Chunking inteligente, resumen previo, tiered RAG |
| Hallucinations en RAG | Medio | Temperature baja, system prompts estrictos, citations |
| Privacidad documentos | Alto | RLS estricto, encrypt at rest, acceso solo docente propietario |

### Qué NO hacer todavía
- ❌ No fine-tuning de modelo todavía
- ❌ No RAG multi-usuario (solo docente propietario)
- ❌ No generación automática sin confirmación (todavía)

### Criterios de Éxito
- [ ] Docente puede hacer una pregunta y recibir respuesta basada en sus documentos en < 3 segundos
- [ ] Top 3 chunks recuperados son relevantes (evaluación humana)
- [ ] Respuesta incluye citation al documento fuente
- [ ] Proyecto puede agrupar documentos + planeaciones + evidencias
- [ ] RAG respeta preferencias previas del docente (ej: formato de planeación preferido)

---

## V11 — Gemini Voice Orb

### Objetivo
ProfeIA habla y escucha. Interacción por voz natural, no solo texto.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **Proxy Gemini** | Infraestructura tipo "Marshanta" para voz | Railway Edge Function |
| **Voz a Texto** | Transcripción de audio del docente | Gemini Speech-to-Text |
| **Texto a Voz** | Respuestas habladas por el asistente | Gemini Text-to-Speech |
| **Orbe Animado** | Avatar visual que responde a la voz (visualización, no video) | Canvas/WebGL animation |
| **Transcripción Live** | Mostrar lo que el docente dice en tiempo real | Streaming WebSocket |
| **Voz → Tool Registry** | Decir "toma asistencia" ejecuta la acción | Intent detection por voz |
| **Wake Word Opcional** | "Hey ProfeIA" para activar (opcional, desactivable) | Local detection |
| **Modo Manos Libres** | Durante clase, comandos de voz sin tocar pantalla | Contexto aula |

### Dependencias
- ✅ Tool Registry existente (V8)
- 🔧 Gemini API con multimodal voice
- 🔧 Railway Edge Function (proxy)
- 🔧 WebSocket infrastructure
- 🔧 Mic permissions UX

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Latencia voz | Alto | Optimistic UI, indicadores de "escuchando", caching |
| Privacidad audio | Alto | No almacenar audio, solo transcripción procesada, opt-in |
| Precisión en español | Medio | Gemini mejora constantemente, fallback a texto |
| Costo API voz | Medio | Rate limiting por tier, procesamiento edge local cuando sea posible |
| Background noise | Medio | Noise cancellation, contexto de aula considerado |

### Qué NO hacer todavía
- ❌ No escucha pasiva permanente (solo wake word o push-to-talk)
- ❌ No almacenamiento de voz del docente sin consentimiento explícito
- ❌ No EVA Classroom todavía (es V12+)

### Criterios de Éxito
- [ ] Latencia voz < 2 segundos round-trip
- [ ] Precisión STT español > 95% para comandos de docente
- [ ] Orbe responde visualmente a la voz (waveform animation)
- [ ] "Crear planeación" por voz funciona end-to-end
- [ ] Docente puede usar sin mirar pantalla (feedback auditivo suficiente)

---

## V12 — HGI Classroom Signals

### Objetivo
ProfeIA "siente" el aula: atención, confusión, estado emocional agregado.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **HGI-MX Activado** | Conexión real al servicio HGI-MX | API Gateway |
| **Attention Signal** | 0-1 nivel de atención del grupo | HGI-MX inference |
| **Confusion Signal** | 0-1 nivel de confusión detectada | HGI-MX inference |
| **Emotional State** | Estado emocional agregado: calm, engaged, distracted, stressed | HGI-MX classification |
| **Classroom Event** | Eventos pedagógicos: participacion, distraccion, confusion, logro | HGI-MX events |
| **Sugerencias Live** | "Los estudiantes parecen confundidos, ¿repasar el concepto?" | Context + HGI signals |
| **Dashboard Afectivo** | Vista docente del estado del grupo en tiempo real | Real-time chart |
| **HGI Privacy Guard** | Verificación de que no se envía PII innecesaria | Audit logs |
| **Fallback Offline** | Si HGI cae, ProfeIA funciona normal (degradación elegante) | Error handling |

### Dependencias
- ✅ HGI-MX API endpoint proporcionado
- ✅ `hgiClient.js` ya existe (V8)
- 🔧 API key HGI-MX de producción
- 🔧 Backend manejo de señales en tiempo real
- 🔧 Tabla `classroom_signals` para historial

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| HGI-MX no disponible | Alto | Fallback inmediato, modo offline, retry con backoff |
| Latencia HGI > 500ms | Medio | Async fetching, no bloquear UI, timeout corto |
| Precisión señales | Medio | Validación docente, feedback loop, calibración por aula |
| Privacidad señales | Alto | Solo agregados, nunca individual, consentimiento escuela |
| Dependencia de terceros | Medio | Abstracción en hgiClient, swappable provider |

### Qué NO hacer todavía
- ❌ No decisiones automáticas solo con HGI (siempre docente en control)
- ❌ No almacenar raw audio/transcripciones
- ❌ No usar señales para grading/evaluación de estudiantes
- ❌ No compartir señales con padres todavía (es V14+)

### Criterios de Éxito
- [ ] HGI signals disponibles en < 500ms (p95)
- [ ] UI no se bloquea si HGI cae
- [ ] Docente recibe 1-2 sugerencias útiles por clase basadas en señales
- [ ] Audit log confirma: no PII enviada a HGI, solo session_id anónimo
- [ ] Escuela puede verificar qué datos se comparten con HGI

---

## V13 — EVA Classroom Safety Node

### Objetivo
EVA se convierte en nodo de seguridad ética del aula. Cámara, video, emergencias.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **EVA Node Hardware** | Cámara dedicada en aula (opt-in escuela) | Hardware partner o tablet dedicada |
| **Video Sin Audio** | Por defecto: solo video, sin captura de sonido | Camera stream |
| **Audio Solo Emergencia** | Activado solo por evento de seguridad confirmado | Conditional mic access |
| **EVA Controlled Access** | EVA decide cuándo escalar, no padres ni docente manual | AI decision engine |
| **Parent Safety Escalation** | Notificación a padres con enlace temporal en emergencias | Push + SMS + JWT token |
| **Audit Logs Inmutables** | Cada acceso, cada decisión queda registrada permanentemente | Append-only logs |
| **Token Temporal Firmado** | JWT con expiración automática, no renovable | RS256, TTL 10 min |
| **Video Gateway Seguro** | WebRTC E2E cifrado, punto a punto | WebRTC + TURN server |
| **Eventos Críticos** | Temblor, accidente, violencia, intruso, emergencia física | Multi-sensor detection |
| **Desactivación de Emergencia** | Docente puede marcar "falsa alarma" | Override manual con justificación |

### Dependencias
- ✅ V12 HGI Signals (contexto de detección)
- ✅ V11 Gemini Voice (comandos de emergencia)
- 🔧 Hardware cámara instalado
- 🔧 Consentimiento digital escuela + padres
- 🔧 Legal review completo
- 🔧 Video gateway infrastructure
- 🔧 WebRTC infrastructure

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Falsos positivos emergencia | Alto | Thresholds conservadores, confirmación multi-factor, desactivación manual |
| Privacidad violada | Crítico | Consentimiento explícito, audit logs, TTL estricto, no grabación permanente |
| Costo infraestructura | Medio | Edge processing, optimización bandwidth, tiered rollout |
| Rechazo escuelas | Alto | Opcional por escuela, pilot controlado, evidencia valor seguridad |
| Legal/regulatorio | Crítico | Abogado especializado, compliance normativa educativa local |

### Qué NO hacer todavía
- ❌ No acceso libre de padres "para ver cómo va la clase"
- ❌ No streaming permanente
- ❌ No grabación de audio rutinaria
- ❌ No reconocimiento facial de alumnos
- ❌ No datos compartidos con terceros no autorizados

### Criterios de Éxito
- [ ] 0 incidentes de privacidad documentados
- [ ] Escuela puede desactivar completamente el sistema
- [ ] Padres reciben notificación de emergencia real en < 30 segundos
- [ ] Token expira correctamente sin intervención humana
- [ ] Audit log muestra cadena completa de decisión desde detección hasta acceso
- [ ] Docente puede desactivar falsa alarma en < 10 segundos

---

## V14 — Parent/Student App Release

### Objetivo
Completar el ecosistema: padres y alumnos conectados con la escuela de forma ética y útil.

### Features Principales

| Feature | Descripción | Tecnología |
|---------|-------------|------------|
| **App Padres/Alumnos** | React Native o PWA dedicada | React Native / Expo |
| **Tareas y Reportes** | Ver tareas asignadas, reportes de progreso | Sync con backend docente |
| **IA Explicadora** | "Explica esta tarea de matemáticas paso a paso" | Gemini con contexto tarea |
| **Tier VIP Seguridad** | Acceso a alertas EVA (solo si escuela tiene V13) | Condicional on EVA Node |
| **Notificaciones Push** | Avisos de tareas, eventos escolares, emergencias | FCM + APNS |
| **Chat de Ayuda** | Dudas sobre tareas, conceptos escolares | Gemini chat |
| **Recordatorios** | "Mañana entregar tarea de ciencias" | Local notifications |
| **Multi-alumno** | Padres con varios hijos en misma/diferente escuela | Account switching |
| **Progreso Visual** | Gráficas de avance, participación, asistencia | Charts, data viz |
| **Comunicación Docente** | Mensajes directos (async, no chat tiempo real) | In-app messaging |
| **Consentimiento Digital** | Flujo de firma para funciones de seguridad | E-signature integration |
| **Opt-out Completo** | Padres pueden rechazar cualquier feature de seguridad | Settings panel |

### Dependencias
- ✅ Backend docente estable (V8+)
- ✅ V13 EVA Node (para VIP seguridad)
- 🔧 React Native / Expo setup
- 🔧 FCM/APNS push certificates
- 🔧 App Store / Play Store accounts
- 🔧 Legal review app stores compliance

### Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Adoption baja | Medio | Onboarding simple, valor inmediato (tareas), marketing escuelas |
| Costo desarrollo móvil | Medio | PWA como MVP, React Native después, priorizar iOS primero (usuarios target) |
| Sincronización datos | Medio | Sync robusto, offline mode, conflict resolution |
| Privacidad datos alumnos | Alto | Minimizar datos, encrypt, no tracking, COPPA/GDPR compliance |
| Soporte multi-plataforma | Medio | Scope definido, iOS primero, Android después |

### Qué NO hacer todavía
- ❌ No geolocalización de alumnos
- ❌ No chat tiempo real docente-padre (async mejor)
- ❌ No red social entre padres
- ❌ No comparación de rendimiento entre alumnos
- ❌ No gamification agresivo

### Criterios de Éxito
- [ ] Padre puede ver tareas del día en < 3 taps desde abierta app
- [ ] IA explica tarea correctamente (evaluación humana)
- [ ] Notificación de emergencia llega en < 1 minuto
- [ ] App funciona offline para tareas ya cargadas
- [ ] 50%+ de padres de escuela piloto descargan y usan semanalmente
- [ ] 0 quejas de privacidad documentadas

---

## Resumen de Dependencias

```
V9 Data Intelligence
  ↓
V10 RAG Pedagógico ← requiere documentos persistentes (V9)
  ↓
V11 Gemini Voice ← requiere Tool Registry estable (V8)
  ↓
V12 HGI Signals ← requiere endpoint HGI-MX productivo
  ↓
V13 EVA Safety ← requiere V12 + consentimiento legal + hardware
  ↓
V14 Parent App ← requiere V13 para VIP + backend estable
```

---

## Roadmap No-Tecnológico

### Legal/Compliance
- **Antes V11**: Revisión grabación de voz docente
- **Antes V12**: Acuerdo de procesamiento de datos con HGI-MX
- **Antes V13**: Consentimiento padres, contrato escuela, seguro cibernético
- **Antes V14**: App store compliance, COPPA, GDPR si aplica

### Business
- **V9-V10**: Precios pilotos con escuelas, feedback pricing
- **V11**: Beta voice con 10 docentes voluntarios
- **V12**: Partnership con HGI-MX, pricing de integración
- **V13**: Insurance para EVA Safety, pilot controlado 3 escuelas
- **V14**: Go-to-market padres, onboarding escuelas

### Research
- **V9**: Estudios OCR listas SEP vs Gemini Vision precisión
- **V10**: Evaluación RAG vs docente-only planeaciones
- **V11**: Usabilidad voz en clase con ruido real
- **V12**: Validación señales HGI con psicopedagogos
- **V13**: Estudio falso positivo/negativo EVA
- **V14**: NPS padres, adoption metrics

---

## Métricas de Éxito por Versión

| Versión | North Star Metric | Target |
|---------|-------------------|--------|
| V9 | Tiempo importación lista alumnos | < 2 minutos |
| V10 | Respuestas RAG útiles / total | > 70% |
| V11 | % comandos voz exitosos | > 80% |
| V12 | Sugerencias HGI aceptadas por docente | > 50% |
| V13 | Tiempo respuesta emergencia real | < 30 seg |
| V14 | MAU padres / total padres escuela | > 40% |

---

## Changelog

### v1.0 (2026-04-30)
- Creación del roadmap V9-V14
- Definición de dependencias secuenciales
- Identificación de riesgos críticos por versión
- Checklist no-go items éticos

---

*Roadmap sujeto a cambios basado en feedback de usuarios y validación técnica*
*Prioridad absoluta: privacidad y ética sobre velocidad de feature delivery*
