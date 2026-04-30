# Parent/Student App Addendum - PROFEIA EVA CANON

> Addendum al PROFEIA_EVA_CANON.md
> Versión: 1.2 (Arquitectura Preliminar)
> Estado: Documentación — No implementado en UI todavía

---

## 1. Propósito

La app de padres y alumnos acompaña el aprendizaje, reportes, tareas y seguridad **sin crear vigilancia**.

No es una herramienta de espionaje parental. Es un canal de acompañamiento educativo que:
- Mantiene informados a los padres sobre el progreso académico
- Ayuda a los alumnos con sus tareas y dudas
- Solo activa funciones de seguridad bajo protocolos éticos estrictos
- Nunca permite monitoreo libre del aula o de otros estudiantes

---

## 2. Tier Padres/Alumnos — Gratis

**Precio:** $0 MXN (Fundamentalmente gratuita)

Este tier es el estándar para todas las familias. La app debe ser completamente funcional sin costo.

### Funcionalidades incluidas:

| Feature | Descripción |
|---------|-------------|
| **Tareas** | Ver tareas asignadas, fechas de entrega, instrucciones |
| **Avisos** | Recibir avisos del docente y de la escuela |
| **Asistencia** | Consultar registro de asistencia del alumno |
| **Progreso** | Ver métricas de avance académico y participación |
| **Reportes** | Acceder a reportes periódicos del docente |
| **Chat de ayuda** | Asistente IA para dudas sobre tareas y conceptos |
| **Explicación de tareas** | IA que explica paso a paso las tareas escolares |
| **Recordatorios** | Alertas de tareas pendientes, exámenes, eventos |
| **IA guiada** | Asistente que guía por clicks (voz futura en roadmap) |

### Principios del tier Gratis:

- **Acompañamiento, no reemplazo**: La IA ayuda, no sustituye al docente
- **Acceso bajo demanda**: Los padres/alumnos deciden cuándo usar la ayuda
- **Sin barreras**: Todo el contenido educativo es accesible sin pagar
- **Respeto al docente**: La comunicación con el docente se mantiene fluida y directa

---

## 3. Tier Padres/Alumnos — VIP Seguridad EVA

**Precio:** Incluido con Tier 3 del docente (no costo adicional directo)

Este tier existe **solo bajo condiciones estrictas**.

### Condiciones requeridas (TODAS deben cumplirse):

1. ✅ **Autorización institucional**: La escuela ha habilitado EVA Classroom
2. ✅ **Consentimiento parental**: Padres/tutores han firmado consentimiento digital
3. ✅ **Docente con Tier 3**: El aula del alumno tiene EVA Assistant Teacher activo
4. ✅ **EVA Node activo**: El nodo de aula está instalado y operando

### Funcionalidades incluidas:

| Feature | Descripción | Control |
|---------|-------------|---------|
| **Alertas de seguridad** | Notificaciones cuando EVA detecta eventos de riesgo | Automático por EVA |
| **Notificación automática** | Push/SMS a padres en eventos críticos | EVA decide cuándo |
| **Acceso temporal a video** | Enlace de video por tiempo limitado en emergencias | Token firmado, expira auto |
| **Audio en emergencia** | Solo cuando hay riesgo físico real | EVA controla activación |
| **Token temporal firmado** | JWT con claims de tiempo, alumno, evento | Expira en minutos |
| **Expiración automática** | Todos los enlaces tienen TTL definido | No configurable por usuarios |
| **Audit log obligatorio** | Cada acceso queda registrado permanentemente | Inmutable |

### Eventos que activan VIP Seguridad:

EVA **solo** escala a VIP cuando detecta:

- Riesgo físico inminente (accidente, violencia)
- Emergencia escolar (temblor, incendio, intruso)
- Situación crítica de seguridad del estudiante
- Código de emergencia activado por docente

**Nunca** por:
- Distracción normal en clase
- Bajo rendimiento académico
- Comportamiento disciplinario menor
- Curiosidad parental

---

## 4. Reglas Éticas Fundamentales

### 🚫 PROHIBIDO Estrictamente

| Prohibición | Razón |
|-------------|-------|
| **Padres abren cámara cuando quieren** | Sería vigilancia, no acompañamiento |
| **Padres escuchan clase normal** | Violación de privacidad de todos los estudiantes |
| **Streaming permanente** | Convertiría el aula en reality show |
| **Acceso a niños ajenos** | Violación de privacidad de otros alumnos |
| **Vigilancia docente** | El docente también tiene derecho a privacidad |
| **Grabación permanente** | Riesgo de datos, violación de confianza |
| **Monitoreo por terceros** | Solo padres/tutores legales, nadie más |

### ✅ PERMITIDO Bajo Protocolo

| Permiso | Condición |
|---------|-----------|
| **EVA detecta evento crítico** | Scoring de riesgo supera umbral |
| **EVA decide escalar** | Algoritmo de decisión, no manual |
| **Padres reciben enlace temporal** | Notificación push con contexto |
| **Acceso con expiración** | TTL de 5-15 minutos, no renovable |
| **Todo auditado** | Logs inmutables, revisables por escuela |

### Principio rector:

> **Los padres nunca pueden espiar. Solo pueden acceder cuando EVA detecta un evento de seguridad y habilita acceso temporal.**

---

## 5. Arquitectura de Cámara EVA

### Modo Normal (Default)

```
Estado: INACTIVO
├─ Sin audio capturado
├─ Sin streaming activo
├─ Sin acceso manual permitido
├─ Padres no pueden solicitar acceso
└─ EVA procesa solo señales agregadas localmente
```

**Características:**
- Cámara puede estar físicamente apagada o con shutter cerrado
- EVA node procesa señales de contexto (HGI-MX) sin video
- No hay transmisión de red
- No hay grabación

### Modo Emergencia (Activado por EVA)

```
Estado: EMERGENCY_STREAM
├─ Video temporal habilitado
├─ Audio temporal SOLO si hay riesgo físico real
├─ Streaming cifrado punto a punto
├─ Token de acceso de un solo uso
├─ TTL automático (expira sin intervención humana)
└─ Audit log registra cada frame accedido
```

**Ejemplos de emergencia válida:**

| Evento | Descripción | Audio permitido |
|--------|-------------|---------------|
| **Temblor/sismo** | Evacuación de edificio | Sí, coordinación |
| **Accidente** | Estudiante o docente herido | Sí, evaluación médica |
| **Violencia** | Altercado físico en aula | Sí, evidencia temporal |
| **Intruso** | Persona no autorizada en escuela | Sí, seguridad |
| **Emergencia física** | Riesgo inminente a integridad | Sí |
| **Código docente** | Docente activa alerta manual | Según configuración |

**Ejemplos que NO son emergencia:**
- Estudiante distraído
- Pelear por un lápiz
- Bajo rendimiento
- No trajo tarea
- Discusión verbal normal

---

## 6. Arquitectura Técnica Futura

### Flujo de Emergencia (Secuencia)

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVA CLASSROOM NODE                          │
│                    (Procesamiento Local)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  1. DETECCIÓN                                                │
│     ├─ Sensores HGI-MX (señales agregadas)                   │
│     ├─ Análisis de audio local (no transmisión)              │
│     ├─ Detección de eventos críticos                         │
│     └─ Umbral: RIESGO_FÍSICO_CONFIRMADO                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  2. SCORING DE RIESGO                                        │
│     ├─ Confidence score > 0.85                                 │
│     ├─ Múltiples señales coinciden                           │
│     ├─ Validación cruzada sensores                           │
│     └─ Decisión: ESCALAR_A_PADRES = true                     │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  3. GENERACIÓN TOKEN                                         │
│     ├─ JWT firmado con RS256                                 │
│     ├─ Claims:                                               │
│     │   • sub: parent_id                                     │
│     │   • student: student_id                                │
│     │   • classroom: classroom_id                            │
│     │   • event: event_type_hash                             │
│     │   • iat: timestamp                                     │
│     │   • exp: timestamp + 10min                             │
│     │   • jti: uuid único (revocación)                       │
│     └─ Expiración: NO NEGOCIABLE                             │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  4. NOTIFICACIÓN PADRES                                      │
│     ├─ Push notification: "Alerta de seguridad - [Alumno]"   │
│     ├─ SMS backup (si configurado)                           │
│     ├─ Email con contexto                                    │
│     └─ Enlace: https://app.profeia.mx/s/[token_único]         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  5. ACCESO TEMPORAL                                          │
│     ├─ Padre abre enlace                                     │
│     ├─ Valida token JWT                                      │
│     ├─ Verifica parent_id matches student                    │
│     ├─ Crea WebRTC peer connection                           │
│     ├─ Stream cifrado E2E                                    │
│     └─ Muestra countdown de expiración visible                 │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  6. EXPIRACIÓN                                               │
│     ├─ Timer alcanza cero                                    │
│     ├─ Token invalidado automáticamente                      │
│     ├─ Stream cortado                                        │
│     ├─ WebSocket cerrado                                     │
│     └─ "Acceso finalizado" mensaje a padre                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  7. AUDIT LOG                                                │
│     ├─ Registro inmutable en base de datos                   │
│     ├─ Campos:                                               │
│     │   • event_id                                           │
│     │   • parent_id                                          │
│     │   • student_id                                         │
│     │   • timestamp_start                                    │
│     │   • timestamp_end                                      │
│     │   • ip_address                                         │
│     │   • user_agent                                         │
│     │   • access_duration_seconds                            │
│     │   • token_jti                                          │
│     └─ Retención: 7 años (normativa educativa)               │
└──────────────────────────────────────────────────────────────┘
```

### Componentes de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     PARENT APP ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Parent     │    │  Student    │    │   Admin     │       │
│  │    App      │    │    App      │    │   Portal    │       │
│  │   (React)   │    │   (React)   │    │   (React)   │       │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│         │                   │                   │             │
│         └───────────────────┼───────────────────┘             │
│                             │                                │
│              ┌──────────────┴──────────────┐                 │
│              │     PROFEIA API GATEWAY     │                 │
│              │      (Railway/Vercel)       │                 │
│              │    ├─ Auth (Supabase)       │                 │
│              │    ├─ Notifications          │                 │
│              │    ├─ Content Delivery       │                 │
│              │    └─ Token Validation         │                 │
│              └──────────────┬──────────────┘                 │
│                             │                                │
│         ┌───────────────────┼───────────────────┐            │
│         │                   │                   │            │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐      │
│  │   Supabase  │    │  EVA Safety │    │  Video      │      │
│  │   Database  │    │   Gateway   │    │  Gateway    │      │
│  │  (Auth+Data)│    │  (HGI-MX)   │    │  (WebRTC)   │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              EVA CLASSROOM NODE (Edge)                   ││
│  │  ├─ HGI-MX Client              ├─ Local AI Inference    ││
│  │  ├─ Signal Processor           ├─ Emergency Detector    ││
│  │  ├─ Token Generator            ├─ Secure Streamer       ││
│  │  └─ Audit Logger               └─ Parent Notifier        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Integración con HGI-MX

### Contrato de Datos

ProfeIA (cliente) **solo recibe señales agregadas** de HGI-MX.

#### Señales que HGI-MX envía:

```json
{
  "attention_signal": 0.0-1.0,
  "confusion_signal": 0.0-1.0,
  "emotional_state": "calm|engaged|distracted|stressed|alert",
  "classroom_event": "participacion|distraccion|confusion|logro|emergencia|none",
  "suggested_intervention": "string|null",
  "confidence": 0.0-1.0,
  "timestamp": "ISO8601"
}
```

#### Datos que HGI-MX NUNCA envía:

| Dato prohibido | Razón |
|----------------|-------|
| Audio crudo | Privacidad, protección infantil |
| Transcripciones completas | Revelaría conversaciones privadas |
| Shards de audio/video | Podrían reconstruirse |
| Referencias a identidades (founders) | Protección de menores |
| PII innecesaria | Solo IDs anónimos de session |

#### Datos que ProfeIA envía a HGI-MX:

```json
{
  "session_id": "uuid",
  "fecha": "ISO8601",
  "classroom_id": "uuid|null",
  "schema_version": "profeia-eva-v1"
}
```

**Nunca:** audio, transcripciones, nombres de alumnos, información personal.

### Flujo de Seguridad EVA ↔ HGI-MX

```
EVA Node Local
├─ Procesa señales HGI-MX en tiempo real
├─ Detecta anomalías de seguridad (scoring interno)
├─ Si emergencia confirmada:
│  ├─ Genera token temporal
│  ├─ Notifica a padres (ProfeIA API)
│  └─ Inicia stream seguro (Video Gateway)
│
HGI-MX
├─ Procesa audio localmente (edge)
├─ Envía solo señales agregadas
├─ No almacena audio de aula
└─ No tiene acceso a tokens de padres
```

---

## 8. Roadmap de Implementación

### Fase 1: Fundamentos (P0)

| Item | Descripción | Dependencias |
|------|-------------|--------------|
| Schema padres/alumnos | Tablas en Supabase | - |
| Relaciones familia | parent ↔ student ↔ classroom | Schema docente estable |
| Auth móvil | OAuth + magic link | AuthContext existente |
| Notificaciones push | FCM/APNS setup | - |

### Fase 2: App Core (P1)

| Item | Descripción |
|------|-------------|
| Lista de tareas | Vista padre/alumno |
| Detalle de tarea | Instrucciones, adjuntos, entrega |
| Avisos escolares | Feed de notificaciones |
| Asistencia | Calendario mensual |
| Progreso | Gráficas simples |
| Chat IA | Gemini para dudas escolares |

### Fase 3: EVA Safety (P2)

| Item | Descripción | Requiere |
|------|-------------|----------|
| Consentimiento digital | Flujo e-signature | Legal |
| Audit logs | Base de logs inmutable | - |
| Token service | Generador JWT de emergencia | EVA Node |
| Video gateway | WebRTC seguro | Infraestructura |
| Parent alerts | Push/SMS gateway | Fase 2 push |

### Fase 4: Premium (P3)

| Item | Descripción |
|------|-------------|
| App nativa iOS/Android | React Native o Flutter |
| Voz en chat | Gemini Voice para explicaciones |
| Offline mode | Cache de tareas para conectividad limitada |
| Multi-alumno | Padres con varios hijos |
| Multi-escuela | Transferencia de datos entre escuelas |

---

## 9. Checklist Ético Pre-Implementación

Antes de escribir cualquier código de seguridad/cámara:

- [ ] Revisión legal: cumplimiento ley de protección de datos menores
- [ ] Consentimiento: flujo de firma digital documentado
- [ ] Auditoría: quién revisará los logs, frecuencia
- [ ] Retención: política de borrado de datos
- [ ] Acceso: quién puede ver audit logs
- [ ] Incidentes: procedimiento de respaldo si falla EVA
- [ ] Desactivación: cómo padres pueden opt-out
- [ ] Escuela: contrato de responsabilidad de datos

---

## 10. Referencias

- [PROFEIA_EVA_CANON.md](./PROFEIA_EVA_CANON.md) - Principios éticos generales
- [PROFEIA_TIERS_MODEL.md](./PROFEIA_TIERS_MODEL.md) - Modelo comercial docente
- [HGI_PROFEIA_CLIENT_PLAN.md](../integration/HGI_PROFEIA_CLIENT_PLAN.md) - Integración HGI-MX

---

## Changelog

### v1.2 (2026-04-30)
- Creación del addendum como documento separado
- Detalle de arquitectura de emergencia con flujo completo
- Especificación del contrato HGI-MX
- Checklist ético pre-implementación
- Roadmap de fases

---

*Documento de arquitectura preliminar*
*No implementar UI hasta aprobación de checklist ético*
