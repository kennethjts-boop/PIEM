# PROFEIA Tiers Model - Documento Oficial

> Basado en PROFEIA_EVA_CANON.md
> Versión: 1.0 (Piloto)

## Resumen Ejecutivo

ProfeIA opera bajo un modelo freemium de 3 tiers que busca:

1. **Democratizar el acceso**: Tier Gratis productivo, no limitado artificialmente
2. **Incentivar upgrades**: Valor claro en cada salto de tier
3. **Generar ingresos sostenibles**: Precios accesibles para docentes mexicanos
4. **Ética EVA**: Nunca vigilancia, siempre acompañamiento

---

## Modelo Comercial

### Tier 1 — Gratis
**Precio:** $0 MXN/mes

**Posicionamiento:**
> "Trabaja manualmente con ayuda del chat"

El Tier Gratis es productivo, no una demo limitada. El docente puede realizar todo su trabajo diario, pero debe hacerlo manualmente.

**Incluye:**
- Dashboard docente completo
- Asistencia manual
- Bitácora manual
- Planeación manual
- Evaluaciones manuales
- Documentos básicos
- RAG limitado (chat con documentos)
- Chat modo sugerencia (copiar/pegar respuestas)
- Onboarding docente completo

**No incluye:**
- Agente ejecutor automático
- OCR por cámara (Gemini Vision)
- Reportes automáticos
- RAG completo con embeddings
- Gemini Voice
- EVA Classroom
- Acciones automáticas del agente

**Experiencia del usuario:**
El docente interactúa con ProfeIA como un chat inteligente que le da sugerencias. Puede copiar la respuesta y aplicarla manualmente en el sistema. Todo su trabajo se guarda, pero él debe ejecutar las acciones.

---

### Tier 2 — Profesional
**Precio:** $399 MXN/mes (~$23 USD)

**Posicionamiento:**
> "ProfeIA hace acciones por ti"

El Tier 2 es el producto principal. El agente ejecuta acciones automáticamente, ahorrando horas de trabajo administrativo.

**Incluye:**
- Todo lo del Tier Gratis
- **Agente ejecutor automático** (13+ herramientas)
- Herramientas automáticas (crear planeación, bitácora, evaluación, etc.)
- **RAG completo** con embeddings y chunks ilimitados
- **OCR listas alumnos** con Gemini Vision
- Cámara/video para captura documental
- Ingestión automática de documentos
- Persistencia pedagógica (aprendizaje del docente)
- Reportes automáticos
- Escucha asistida (contexto de clase)
- Logging inteligente
- App docente completa
- Envío de tareas a padres/alumnos
- Modelo tuned docente (futuro)

**Agent Tools disponibles:**
- `crear_planeacion` - Genera planeaciones completas
- `guardar_bitacora` - Registra incidentes y observaciones
- `crear_evaluacion` - Crea evaluaciones con rúbricas
- `tomar_asistencia_rapida` - Asistencia por voz/texto
- `crear_actividad` - Actividades pedagógicas
- `actualizar_planeacion_estado` - Gestiona ciclo de vida
- `preparar_reporte_dia` - Reportes automáticos

**Experiencia del usuario:**
El docente dice "crea una planeación de matemáticas sobre fracciones" y ProfeIA:
1. Entiende el contexto (grado, libro, semana)
2. Genera la planeación completa
3. Muestra preview para confirmar
4. Guarda automáticamente en la base de datos

---

### Tier 3 — EVA Assistant Teacher
**Precio:** $799 MXN/mes (~$47 USD)

**Posicionamiento:**
> "EVA se convierte en segundo asistente docente"

El Tier 3 es un superpoder docente. EVA (Ethical Virtual Assistant) opera en tiempo real durante la clase.

**Incluye:**
- Todo lo del Tier Profesional
- Mayor capacidad de agente (más contexto, más tokens)
- **Gemini Voice** - Interacción por voz natural
- **Orbe animado** - Presencia visual en el aula
- **Transcripción en vivo** (bajo reglas éticas estrictas)
- **EVA Assistant Teacher mode**
- Second teacher assistant mode
- Mini-stories pedagógicas generadas automáticamente
- Toma de notas de clase automática
- Inferencia sobre dinámica de clase
- Participación en tiempo real
- Sugerencias live durante la clase
- Apertura contextual de links (recursos educativos)
- EVA desktop personal
- EVA classroom node
- **Señales HGI/EVA Classroom** (contexto afectivo)
- **Safety escalation para padres** (bajo protocolo ético)

**Reglas EVA (críticas):**
- EVA nunca graba audio por defecto
- EVA n permite streaming permanente
- EVA solo activa funciones sensibles bajo eventos de seguridad
- Padres no pueden "espiar" - solo acceden en emergencias via token temporal
- Todo acceso queda auditado

**Experiencia del usuario:**
Durante clase, EVA puede:
- Detectar confusión en el grupo (via HGI signals)
- Sugerir al docente: "Revisa si entendieron el concepto de fracciones"
- Tomar notas de participación
- Recordar al docente: "María no ha participado hoy"
- En emergencia: notificar a padres con acceso temporal controlado

---

## Sistema de Trials (Trial Ladder)

### Trial Tier 2 — Universal
**Duración:** 30 días
**Elegibilidad:** Todos los nuevos docentes automáticamente

Todos los docentes empiezan con Tier 2 gratis durante 1 mes. Esto permite:
- Experimentar el valor real del agente ejecutor
- Crear dependencia positiva de la herramienta
- Convertir mejor cuando el trial termina

**Flujo post-trial:**
1. Usuario puede pagar $399/mes → conserva Tier 2
2. Usuario no paga → downgrade automático a Tier 1 (Gratis)
3. Datos se preservan, funciones premium se desactivan

### Trial Tier 3 — Upgrade Path
**Duración:** 30 días
**Elegibilidad:** Solo usuarios con Tier 2 pagado activo
**Precio durante trial:** $399/mes (precio de Tier 2)

Los usuarios que pagan Tier 2 pueden probar Tier 3 por 1 mes al mismo precio. Después del mes:
- Sube a $799/mes si quieren conservar EVA
- Pueden volver a Tier 2 ($399/mes)
- Pueden downgrade a Tier 1 (Gratis)

**Razón:** El Tier 3 requiere HGI-MX y infraestructura más compleja. Queremos que solo usuarios comprometidos prueben EVA.

---

## Feature Matrix

| Feature | Tier 1 | Tier 2 | Tier 3 |
|---------|--------|--------|--------|
| Dashboard | ✅ | ✅ | ✅ |
| Asistencia manual | ✅ | ✅ | ✅ |
| Bitácora manual | ✅ | ✅ | ✅ |
| Planeación manual | ✅ | ✅ | ✅ |
| Chat sugerencias | ✅ | ✅ | ✅ |
| Agente ejecutor | ❌ | ✅ | ✅ |
| OCR Gemini Vision | ❌ | ✅ | ✅ |
| RAG completo | ❌ | ✅ | ✅ |
| Reportes automáticos | ❌ | ✅ | ✅ |
| Gemini Voice | ❌ | ❌ | ✅ |
| EVA Classroom | ❌ | ❌ | ✅ |
| HGI Signals | ❌ | ❌ | ✅ |
| Safety escalation | ❌ | ❌ | ✅ |

---

## Manual vs Automático

### Qué significa "manual" en Tier 1

| Acción | Tier 1 (Manual) | Tier 2+ (Automático) |
|--------|-----------------|---------------------|
| Crear planeación | Docente copia sugerencia del chat y la pega manualmente en el formulario | ProfeIA crea y guarda automáticamente |
| Tomar asistencia | Docente marca cada alumno en la interfaz | Docente dice "todos presentes" o escanea lista |
| Registrar bitácora | Docente abre formulario y escribe | Docente dice "anota que hubo bullying" |
| Crear evaluación | Docente diseña rúbrica manualmente | ProfeIA genera evaluación con criterios |

### El docente Tier 1 NO está limitado
Puede hacer todo su trabajo. Solo que:
- Toma más tiempo (interacciones manuales)
- Requiere más clicks
- No tiene persistencia avanzada del agente

---

## Implementación Técnica

### Archivos clave

```
profeia/client/src/lib/tiers.js          # Definición de tiers y helpers
profeia/client/src/pages/TiersPage.jsx   # UI de planes
profeia/client/src/components/           # Usa canExecuteAgentTools(), etc.
```

### Helpers principales

```javascript
// tiers.js

// Get tier básico
getCurrentTier(userProfile) → 1 | 2 | 3

// Get tier considerando trial activo
getUserEffectiveTier(userProfile) → 1 | 2 | 3

// Check trial
isTrialActive(userProfile) → boolean
getTrialState(userProfile) → { hasTrial, tier, daysRemaining, isExpired }

// Feature gates
isFeatureAvailable(featureId, tier) → boolean
canExecuteAgentTools(userProfile) → boolean
canUseVoice(userProfile) → boolean
canUseEVA(userProfile) → boolean
canUseOCR(userProfile) → boolean
canUseFullRAG(userProfile) → boolean
canUseParentSafety(userProfile) → boolean

// UI helpers
getTierCTAText(tierId, isCurrent, hasTrial) → string
getTrialExplanation(tierId) → string
arePaymentsEnabled() → boolean
```

### Feature Groups

```javascript
// Para referencia lógica, no gating directo
manualFeatures           // Tier 1
chatSuggestionFeatures   // Tier 1
agentExecutionFeatures   // Tier 2+
ragLimitedFeatures       // Tier 1
ragFullFeatures          // Tier 2+
ocrFeatures              // Tier 2+
voiceFeatures            // Tier 3
evaFeatures              // Tier 3
parentSafetyFeatures     // Tier 3
```

### PILOT_TRIAL_ACCESS Flag

```javascript
export const PILOT_TRIAL_ACCESS = true
```

**Propósito:** Durante el piloto, todos tienen acceso completo para evaluar la herramienta.

**NO es el modelo productivo.** En producción real:
1. Set `PILOT_TRIAL_ACCESS = false`
2. Los gates respetarán tiers reales
3. Solo usuarios con trial activo o suscripción pagada tendrán acceso premium

**Documentación:** El flag está claramente documentado en el código como "modo piloto/demo".

---

## Stripe - Implementación Futura

### Configuración actual

```javascript
STRIPE_CONFIG = {
  enabled: false,  // No activo todavía
  2: { price_id: 'price_PLACEHOLDER...', status: 'inactive' },
  3: { price_id: 'price_PLACEHOLDER...', status: 'inactive' }
}
```

### Para activar pagos reales

1. **Crear productos en Stripe Dashboard:**
   - Producto: "ProfeIA Profesional"
   - Precio: $399 MXN/mes recurrente
   - ID: `price_PROFESIONAL_MXN_001`

   - Producto: "ProfeIA EVA"
   - Precio: $799 MXN/mes recurrente
   - ID: `price_EVA_MXN_001`

2. **Actualizar STRIPE_CONFIG:**
   ```javascript
   STRIPE_CONFIG = {
     enabled: true,
     2: { stripe_price_id: 'price_PROFESIONAL_MXN_001', ... },
     3: { stripe_price_id: 'price_EVA_MXN_001', ... }
   }
   ```

3. **Backend - Webhook Stripe:**
   - Endpoint: `POST /api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `invoice.paid`, `subscription.canceled`
   - Actualiza `userProfile.tier` y `userProfile.subscriptionStatus` en Supabase

4. **Frontend - Checkout:**
   - Botones en TiersPage redirigen a Stripe Checkout
   - URL de éxito: `/checkout/success`
   - URL de cancelación: `/checkout/canceled`

5. **Set PILOT_TRIAL_ACCESS = false**

6. **Test ladder:**
   - Nuevo usuario → Trial Tier 2 por 30 días
   - Paga → Tier 2 activo
   - No paga → Downgrade a Tier 1
   - Upgrade a Tier 3 → Trial 30 días a $399
   - Después → $799/mes o downgrade

---

## Métricas de Negocio a Trackear

1. **Trial Conversion Rate**: % de usuarios que pagan después del trial Tier 2
2. **Upgrade Rate Tier 3**: % de Tier 2 que prueban/activan Tier 3
3. **Churn Rate**: % de cancelaciones mensuales
4. **Feature Adoption**: Qué features usan más los usuarios pagados
5. **Time to Value**: Cuánto tardan en crear su primera planeación automática

---

## Consideraciones Éticas

### Tier 1 es digno
Nunca diseñar el Tier Gratis como "insuficiente para trabajar". Debe ser una herramienta completa que el docente pueda usar diariamente.

### Upgrades por valor, no por restricción
El docente paga por:
- Ahorro de tiempo (automatización)
- Capacidades avanzadas (voz, EVA)
- No por "desbloquear lo básico"

### EVA require consentimiento explícito
El Tier 3 tiene requisitos adicionales:
- Consentimiento institucional (escuela)
- Consentimiento de padres/tutores
- Capacitación docente sobre ética EVA
- Audit logs permanentes

---

## Changelog

### v1.0 (2026-04-30)
- Creación del modelo oficial basado en PROFEIA_EVA_CANON
- Definición de 3 tiers: Gratis ($0), Profesional ($399), EVA ($799)
- Sistema de trial ladder: 30 días Tier 2 universal, 30 días Tier 3 para pagados
- Feature groups documentados
- Helpers de feature gating implementados
- Flag PILOT_TRIAL_ACCESS para modo demo
- Stripe configurado como "próximamente"

---

## Referencias

- PROFEIA_EVA_CANON.md - Principios éticos y reglas de negocio
- tiers.js - Implementación técnica
- TiersPage.jsx - UI de planes

---

*Documento mantenido por el equipo de ProfeIA*
*Para dudas: contactar a producto@profeia.mx*
