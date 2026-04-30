# PROFEIA + EVA CANON

## 1. Principio rector

EVA no vigila. EVA protege.

ProfeIA es una plataforma educativa ética para docentes, escuelas, padres y alumnos. Su objetivo es reducir carga administrativa, mejorar acompañamiento pedagógico y proteger a los estudiantes sin convertir el aula en un sistema de vigilancia.

## 2. Reglas fundamentales EVA

EVA nunca debe operar como herramienta de espionaje.

EVA no debe permitir:
- monitoreo libre de alumnos
- escucha permanente de clase
- acceso manual permanente a cámara
- grabación continua
- vigilancia del docente
- vigilancia de niños por terceros

EVA solo puede habilitar funciones sensibles bajo reglas estrictas:
- consentimiento institucional
- consentimiento de padres/tutores
- evento de seguridad detectado
- acceso temporal
- token firmado
- expiración automática
- audit log obligatorio

## 3. Cámara EVA Classroom

La cámara del aula no graba sonido por defecto.

Modo normal:
- sin audio
- sin streaming permanente
- sin acceso libre para padres
- sin acceso libre para docentes
- sin acceso libre para admins
- solo señales agregadas o eventos seguros

Modo emergencia:
- video temporal permitido
- audio temporal permitido solo en emergencia real
- eventos posibles:
  - riesgo físico
  - temblor
  - accidente
  - violencia
  - emergencia escolar
  - situación crítica de seguridad

Regla central:
Los padres no pueden abrir la cámara cuando quieran. EVA decide cuándo habilitar acceso temporal.

## 4. Acceso de padres

Los padres solo pueden ver a sus hijos bajo protocolos autorizados.

Acceso permitido:
- enlace temporal
- solo evento justificado
- expiración automática
- registro de acceso
- revocación inmediata

Acceso prohibido:
- escuchar clase normal
- abrir cámara libremente
- revisar alumnos ajenos
- monitorear docente
- acceder a grabaciones permanentes

## 5. Tier docente 1 — Gratis

El Tier Gratis es productivo, no solo demo.

Incluye:
- dashboard docente
- asistencia manual
- bitácora manual
- planeación manual
- evaluaciones manuales
- carga básica de documentos
- RAG limitado
- chat asistente modo sugerencia
- copiar/pegar respuestas
- onboarding docente

No incluye:
- agente ejecutor
- acciones automáticas
- OCR alumnos por cámara
- RAG completo
- reportes automáticos
- escucha aula
- modelo tuned
- Gemini Voice
- EVA Classroom
- herramientas premium

Objetivo:
El docente puede trabajar, pero debe hacer las acciones manualmente.

## 6. Tier docente 2 — Profesional

Precio oficial:
$399 MXN / mes

Trial:
Todos los docentes empiezan con Tier 2 gratis por un mes.

Después del mes gratis:
- si pagan, conservan Tier 2
- si no pagan, vuelven a Tier Gratis

Incluye:
- todo Tier Gratis
- agente ejecutor
- herramientas automáticas
- RAG completo
- OCR listas alumnos con Gemini Vision
- cámara para agilizar inscripción
- video/cámara para captura documental
- ingestión automática de documentos
- persistencia pedagógica
- reportes automáticos
- escucha asistencia
- logging inteligente
- app docente completa
- envío de tareas a padres/alumnos
- modelo tuned docente futuro

El Tier 2 es el producto principal para docentes.

## 7. Tier docente 3 — EVA Assistant Teacher

Precio oficial:
$799 MXN / mes

Trial:
Los docentes que pagan Tier 2 pueden probar Tier 3 durante un mes al mismo precio del Tier 2.

Incluye:
- todo Tier 2
- más capacidad de agente
- voz Gemini
- orbe animado
- transcripción en vivo
- EVA Assistant Teacher
- second teacher assistant mode
- mini-stories pedagógicas
- toma de notas de clase
- inferencia sobre la clase
- participación en tiempo real
- sugerencias live
- apertura contextual de links
- EVA desktop personal
- EVA classroom node
- señales HGI/EVA
- seguridad EVA para padres

El Tier 3 es un superpoder docente, no solo una mejora visual.

## 8. App padres/alumnos — Gratis

La app de padres y alumnos debe ser fundamentalmente gratuita.

Incluye:
- tareas
- avisos
- reportes
- asistencia
- progreso
- explicación de tareas
- chat de ayuda
- apoyo educativo con IA
- recordatorios
- comunicación guiada

Los padres y alumnos deciden cuándo usar la ayuda. La IA acompaña, no reemplaza al docente.

## 9. App padres/alumnos — VIP Seguridad EVA

El VIP de padres/alumnos solo existe si:
- la escuela lo autoriza
- los padres consienten
- el docente/aula tiene Tier 3 activo
- EVA Classroom está habilitada

Incluye:
- alertas de seguridad
- notificaciones automáticas
- acceso temporal a video en eventos críticos
- audio solo en emergencia real
- enlaces temporales
- auditoría completa

Regla:
Los padres nunca pueden espiar. Solo pueden acceder cuando EVA detecta un evento de seguridad y habilita acceso temporal.

## 10. OCR con Gemini Vision

Se adopta Gemini Vision como motor inicial para OCR.

Usos:
- listas impresas
- listas SEP
- fotos de cuaderno
- capturas de Excel
- PDFs escaneados
- actas o formatos oficiales

Flujo:
foto/lista
→ Gemini Vision
→ extracción estructurada
→ preview editable
→ normalización de nombres
→ detección duplicados
→ confirmación docente
→ creación de alumnos en base de datos

Esta función pertenece a Tier 2.

## 11. Documentos y RAG

Los documentos no son simples archivos.

Cada documento debe poder convertirse en:
- resumen
- clasificación
- chunks
- embeddings
- fuente consultable
- acciones sugeridas
- clase generada
- actividad generada
- evaluación generada
- chat con documento

Debe existir persistencia local y/o cloud según entorno.

El RAG del docente debe aprender de:
- documentos subidos
- proyectos
- planeaciones
- bitácoras
- evaluaciones
- reportes
- contexto escolar

## 12. Proyectos pedagógicos

Los proyectos son una entidad central.

El agente debe:
- guiar captura de proyectos
- pedir detalles faltantes
- llenar formularios
- organizar evidencias
- inferir criterios con el tiempo
- generar reportes
- reutilizar aprendizajes

Mientras más información suba el docente, mejor podrá ayudar ProfeIA.

## 13. Roles

Roles principales:
- teacher/docente
- director
- admin
- superadmin
- parent
- student

Docente:
trabajo diario del aula.

Director:
reportes de escuela, docentes, grupos y avisos.

Admin:
operación amplia, escuelas, documentos, usuarios.

Superadmin:
VistaDev/plataforma, billing, tenants, seguridad.

Padres:
acompañamiento, reportes, tareas y seguridad EVA bajo consentimiento.

Alumnos:
tareas, apoyo, explicaciones y progreso.

## 14. Motores del sistema

ProfeIA se compone de tres motores:

1. Agent Execution Engine
Ejecuta acciones reales:
- asistencia
- bitácora
- planeación
- evaluación
- tareas
- avisos
- reportes

2. Knowledge/RAG Engine
Entiende documentos:
- RAG
- OCR
- embeddings
- proyectos
- historial docente

3. EVA Engine
Aporta:
- voz
- señales éticas
- contexto afectivo
- seguridad
- acompañamiento

## 15. HGI-MX

HGI-MX no es un módulo interno de ProfeIA.

HGI-MX es infraestructura ética independiente consumida por API.

ProfeIA es un cliente de HGI-MX.

HGI-MX debe poder servir en el futuro a:
- ProfeIA
- Marshanta
- CONTRASTE
- otras apps éticas

ProfeIA nunca debe absorber ni destruir HGI-MX.

## 16. Regla de privacidad HGI/EVA

ProfeIA no debe recibir:
- audio crudo
- transcripciones crudas
- shards completos
- referencias founder
- datos sensibles innecesarios

ProfeIA solo debe recibir señales agregadas:
- attention_signal
- confusion_signal
- emotional_state
- classroom_event
- suggested_intervention
- confidence