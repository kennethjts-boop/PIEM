# HGI-MX ↔ Profeia — Plan de Integración Cliente

**Versión:** 1.0 | **Fecha:** 2026-04-28 | **Estado:** Preparado (sin conexión activa)

## Principio fundamental

Profeia es **cliente** de HGI-MX. HGI-MX es un servicio externo independiente.

- HGI-MX NO se modifica en este repo
- HGI-MX NO se absorbe como módulo interno
- Profeia consume señales **agregadas** de HGI-MX por API
- Audio, transcripts y shards de voz NO entran a Profeia

## Contrato de datos (Schema: profeia-eva-v1)

```json
{
  "schema": "profeia-eva-v1",
  "attention_signal": 0.0,
  "confusion_signal": 0.0,
  "emotional_state": "calm | engaged | distracted | stressed",
  "classroom_event": "participacion | distraccion | confusion | logro | none",
  "suggested_intervention": "texto libre",
  "confidence": 0.0,
  "source": "hgi-mx",
  "timestamp": "ISO string"
}
```

## Reglas de privacidad

- NO se envía audio a Profeia
- NO se envían transcripts a Profeia
- NO se envían datos personales de alumnos a HGI-MX
- Solo se envía: `session_id` anónimo + `fecha`
- HGI-MX procesa el audio en su propio entorno
- Profeia recibe solo señales agregadas y anonimizadas

## Fases de integración

### Fase 0 — Preparación (ACTUAL)

- `hgiClient.js` creado con contrato oficial
- `agentContext.js` tiene campos `emotionalSignals` y `evaObservations` preparados
- Variables de entorno documentadas en `.env.example`
- Sin conexión activa

### Fase 1 — Integración básica (Tier 3)

- Configurar `VITE_HGI_API_URL` y `VITE_HGI_API_KEY`
- `fetchHgiClassroomSignals()` comienza a retornar señales reales
- `buildAgentContext()` incluye `emotionalSignals` en el contexto del agente
- `agentReasoner` puede usar señales para mejorar sugerencias

### Fase 2 — Integración avanzada (Tier 3 completo)

- `evaObservations` pobladas desde HGI-MX
- ProfeIA puede referenciar señales en sus respuestas
- Panel de clase en tiempo real (solo para docente)

### Fase 3 — EVA Voice (futuro)

- Agente de voz EVA integrado
- Requiere consentimiento explícito del docente
- Solo analiza voz del docente, no de alumnos

## Variables de entorno requeridas (Fase 1+)

```bash
VITE_HGI_API_URL=https://api.hgi-mx.com
VITE_HGI_API_KEY=<api_key_de_hgi>
```

## Punto de integración en el código

```text
profeia/client/src/lib/hgiClient.js     ← cliente HTTP
profeia/client/src/lib/agentContext.js  ← buildAgentContext() llama a fetchHgiClassroomSignals()
profeia/client/src/lib/agentReasoner.js ← recibe emotionalSignals en context_summary
```
