import { supabase } from './lib/supabaseClient'

const RAW_API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const API_BASE = RAW_API_BASE || '/api'
const DOCUMENTS_BACKEND = (import.meta.env.VITE_DOCUMENTS_BACKEND || 'local').toLowerCase()
const IS_ABSOLUTE_API_BASE = /^https?:\/\//i.test(API_BASE)

if (!import.meta.env.DEV && !RAW_API_BASE) {
  throw new Error('VITE_API_BASE_URL is required in production to reach profeia/server.')
}

if (!import.meta.env.DEV && DOCUMENTS_BACKEND === 'local' && !IS_ABSOLUTE_API_BASE) {
  throw new Error('With VITE_DOCUMENTS_BACKEND=local in production, set VITE_API_BASE_URL to the absolute backend URL for /api/admin/documents.')
}

const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9._-]/g, '_')

const mapSourceTypeToCategoria = (sourceType) => {
  const normalized = String(sourceType || '').toLowerCase()
  if (normalized === 'leyes') return 'Leyes'
  if (normalized === 'normas') return 'Normas'
  if (normalized === 'libro_proyectos') return 'Planes de Estudio'
  // Legacy mapping kept for existing rows created before reversible category support.
  if (normalized === 'pda') return 'Normas'
  return 'Recursos'
}

const mapProcessingStatusToEstado = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'completed') return 'listo'
  if (normalized === 'error') return 'error'
  return 'procesando'
}

const mapCategoriaToSourceType = (categoria) => {
  if (categoria === 'Planes de Estudio') return 'libro_proyectos'
  if (categoria === 'Leyes') return 'leyes'
  if (categoria === 'Normas') return 'normas'
  return 'recurso'
}

const mapSupabaseDocumentToAdminShape = (row) => ({
  id: row.id,
  nombre: row.title,
  categoria: mapSourceTypeToCategoria(row.source_type),
  archivo: row.file_path,
  estado: mapProcessingStatusToEstado(row.processing_status),
  creado_en: row.created_at,
})

export const api = {
  // Docentes
  getDocentes: async () => {
    const res = await fetch(`${API_BASE}/docentes`)
    return res.json()
  },
  createDocente: async (data) => {
    const res = await fetch(`${API_BASE}/docentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Planeaciones
  getPlaneaciones: async (docenteId, mes, anio) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/planeaciones?mes=${mes}&anio=${anio}`)
    return res.json()
  },

  // Eventos
  getEventos: async (docenteId, mes, anio) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/eventos?mes=${mes}&anio=${anio}`)
    return res.json()
  },

  // Bitacora
  getBitacora: async (docenteId, fecha) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/bitacora?fecha=${fecha}`)
    return res.json()
  },
  createBitacora: async (docenteId, data) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  // Asistencia
  getAsistencia: async (docenteId, fecha) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/asistencia?fecha=${fecha}`)
    return res.json()
  },
  saveAsistencia: async (docenteId, fecha, registros) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/asistencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, registros })
    })
    return res.json()
  },

  // Sugerencias
  getSugerencias: async (docenteId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/sugerencias`)
    return res.json()
  },
  aceptarSugerencia: async (docenteId, sugerenciaId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/sugerencias/${sugerenciaId}/aceptar`, {
      method: 'POST'
    })
    return res.json()
  },
  rechazarSugerencia: async (docenteId, sugerenciaId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/sugerencias/${sugerenciaId}/rechazar`, {
      method: 'POST'
    })
    return res.json()
  },

  // Recomendaciones IA
  getRecomendaciones: async (docenteId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/recomendaciones`)
    if (!res.ok) throw new Error(`recomendaciones ${res.status}`)
    return res.json()
  },

  // Stats (totals)
  getStats: async (docenteId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/stats`)
    return res.json()
  },

  // Weekly stats — single endpoint replaces 7 separate calls in StatsCard
  getStatsSemanal: async (docenteId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/stats-semanal`)
    if (!res.ok) throw new Error(`stats-semanal ${res.status}`)
    return res.json()
  },

  // Normas
  getNormas: async (tipo) => {
    const url = tipo ? `${API_BASE}/normas?tipo=${tipo}` : `${API_BASE}/normas`
    const res = await fetch(url)
    return res.json()
  },

  // Calendar summary
  getCalendarSummary: async (docenteId, mes, anio) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/calendar-summary?mes=${mes}&anio=${anio}`)
    return res.json()
  },

  // Evaluaciones
  getEvaluaciones: async (docenteId, { mes, anio, fecha } = {}) => {
    const params = fecha ? `fecha=${fecha}` : `mes=${mes}&anio=${anio}`
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/evaluaciones?${params}`)
    return res.json()
  },
  createEvaluacion: async (docenteId, data) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/evaluaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },
  deleteEvaluacion: async (id) => {
    const res = await fetch(`${API_BASE}/evaluaciones/${id}`, { method: 'DELETE' })
    return res.json()
  },

  // Alumnos
  getAlumnos: async (docenteId, filters = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).toString()
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/alumnos${params ? '?' + params : ''}`)
    return res.json()
  },
  createAlumno: async (docenteId, data) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/alumnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },
  updateAlumno: async (id, data) => {
    const res = await fetch(`${API_BASE}/alumnos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },
  deleteAlumno: async (id) => {
    const res = await fetch(`${API_BASE}/alumnos/${id}`, { method: 'DELETE' })
    return res.json()
  },
  getDiagnosticos: async (alumnoId) => {
    const res = await fetch(`${API_BASE}/alumnos/${alumnoId}/diagnosticos`)
    return res.json()
  },
  createDiagnostico: async (alumnoId, data) => {
    const res = await fetch(`${API_BASE}/alumnos/${alumnoId}/diagnosticos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  }
}

// ── Webhook URL resolution (Admin Panel > .env > hardcoded fallback) ──
export const getWebhookUrl = () =>
  localStorage.getItem('profeia_webhook_url') ||
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'https://n8n.tudominio.com/webhook/profeia-chat'

export const saveWebhookUrl = (url) =>
  localStorage.setItem('profeia_webhook_url', url)

export const sendProfeIAMessage = async ({ mensaje, docenteId, fecha, grado }) => {
  const url = getWebhookUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje, docenteId, fecha, grado, contexto: 'profeia-chat' })
  })
  if (!res.ok) throw new Error(`Webhook ${res.status}`)
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { respuesta: text } }
}

// ── Admin: document upload ──
export const getDocumentsBackend = () => DOCUMENTS_BACKEND

export const uploadDocument = async (file, categoria) => {
  if (DOCUMENTS_BACKEND === 'supabase') {
    return uploadDocumentToSupabase(file, categoria)
  }

  const form = new FormData()
  form.append('file', file)
  form.append('categoria', categoria)
  const res = await fetch(`${API_BASE}/admin/documents`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return res.json()
}

export const getDocuments = async () => {
  if (DOCUMENTS_BACKEND === 'supabase') {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, source_type, file_path, processing_status, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Supabase documents read failed: ${error.message}`)
    return (data || []).map(mapSupabaseDocumentToAdminShape)
  }

  const res = await fetch(`${API_BASE}/admin/documents`)
  if (!res.ok) throw new Error(`Documents fetch failed (${res.status})`)
  return res.json()
}

export const deleteDocument = async (id) => {
  if (DOCUMENTS_BACKEND === 'supabase') {
    const { data: row, error: readError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (readError) throw new Error(`Supabase documents read failed: ${readError.message}`)

    if (row?.file_path) {
      const { error: storageError } = await supabase.storage.from('documents').remove([row.file_path])
      if (storageError) throw new Error(`Supabase storage delete failed: ${storageError.message}`)
    }

    const { error: deleteError } = await supabase.from('documents').delete().eq('id', id)
    if (deleteError) throw new Error(`Supabase documents delete failed: ${deleteError.message}`)

    return { ok: true }
  }

  const res = await fetch(`${API_BASE}/admin/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
  return res.json()
}

export const uploadDocumentToSupabase = async (file, categoria) => {
  const timestamp = Date.now()
  const safeName = sanitizeFilename(file.name)
  const path = `${timestamp}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    })

  if (uploadError) throw new Error(`Supabase storage upload failed: ${uploadError.message}`)

  const sourceType = mapCategoriaToSourceType(categoria)
  const { data: createdRow, error: insertError } = await supabase
    .from('documents')
    .insert({
      title: file.name,
      source_type: sourceType,
      file_path: path,
      processing_status: 'pending',
    })
    .select('id, title, source_type, file_path, processing_status, created_at')
    .single()

  if (insertError) {
    await supabase.storage.from('documents').remove([path])
    throw new Error(`Supabase documents insert failed: ${insertError.message}`)
  }

  return mapSupabaseDocumentToAdminShape(createdRow)
}
