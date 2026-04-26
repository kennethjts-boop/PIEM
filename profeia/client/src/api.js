import { supabase } from './lib/supabaseClient'

const RAW_API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const API_BASE = RAW_API_BASE || '/api'
const DOCUMENTS_BACKEND = (import.meta.env.VITE_DOCUMENTS_BACKEND || 'local').toLowerCase()

export class ApiUnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'ApiUnauthorizedError'
    this.status = 401
  }
}

const createUnauthorizedError = (message = 'Unauthorized') => new ApiUnauthorizedError(message)

const getAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Auth session failed: ${error.message}`)
  const token = data?.session?.access_token
  if (!token) throw createUnauthorizedError('No active session')
  return token
}

const apiFetch = async (path, options = {}) => {
  const token = await getAccessToken()
  const headers = new Headers(options.headers || {})
  headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    throw createUnauthorizedError('Session expired or unauthorized')
  }

  return res
}

const readApiJson = async (res, operation) => {
  const contentType = res.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    const message = payload?.error || payload?.message || `${operation} failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.payload = payload
    throw err
  }

  return payload
}

const apiJson = async (path, options, operation) => {
  const res = await apiFetch(path, options)
  return readApiJson(res, operation)
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

const isPrivilegedRole = (role) => role === 'admin' || role === 'superadmin'

const isDocumentInScope = (row, context) => {
  if (!row || !context) return false
  if (isPrivilegedRole(context.role)) return true
  return row.owner_user_id === context.userId || (row.school_id && context.schoolId && row.school_id === context.schoolId)
}

const getAuthenticatedDocumentContext = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(`Auth user failed: ${userError.message}`)
  const authUser = userData?.user
  if (!authUser?.id) throw createUnauthorizedError('No authenticated user')

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, role, school_id')
    .eq('id', authUser.id)
    .single()

  if (profileError) throw new Error(`User profile lookup failed: ${profileError.message}`)

  return {
    userId: authUser.id,
    role: profile?.role || 'teacher',
    schoolId: profile?.school_id || null,
  }
}

export const api = {
  // Docentes
  getDocentes: async () => {
    return apiJson('/docentes', undefined, 'docentes fetch')
  },
  createDocente: async (data) => {
    return apiJson('/docentes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'docente create')
  },

  // Planeaciones
  getPlaneaciones: async (docenteId, mes, anio) => {
    return apiJson(`/docentes/${docenteId}/planeaciones?mes=${mes}&anio=${anio}`, undefined, 'planeaciones fetch')
  },

  // Eventos
  getEventos: async (docenteId, mes, anio) => {
    return apiJson(`/docentes/${docenteId}/eventos?mes=${mes}&anio=${anio}`, undefined, 'eventos fetch')
  },

  // Bitacora
  getBitacora: async (docenteId, fecha) => {
    return apiJson(`/docentes/${docenteId}/bitacora?fecha=${fecha}`, undefined, 'bitacora fetch')
  },
  createBitacora: async (docenteId, data) => {
    return apiJson(`/docentes/${docenteId}/bitacora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'bitacora create')
  },

  // Asistencia
  getAsistencia: async (docenteId, fecha) => {
    return apiJson(`/docentes/${docenteId}/asistencia?fecha=${fecha}`, undefined, 'asistencia fetch')
  },
  saveAsistencia: async (docenteId, fecha, registros) => {
    return apiJson(`/docentes/${docenteId}/asistencia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, registros })
    }, 'asistencia save')
  },

  // Sugerencias
  getSugerencias: async (docenteId) => {
    return apiJson(`/docentes/${docenteId}/sugerencias`, undefined, 'sugerencias fetch')
  },
  aceptarSugerencia: async (docenteId, sugerenciaId) => {
    return apiJson(`/docentes/${docenteId}/sugerencias/${sugerenciaId}/aceptar`, {
      method: 'POST'
    }, 'sugerencia aceptar')
  },
  rechazarSugerencia: async (docenteId, sugerenciaId) => {
    return apiJson(`/docentes/${docenteId}/sugerencias/${sugerenciaId}/rechazar`, {
      method: 'POST'
    }, 'sugerencia rechazar')
  },

  // Recomendaciones IA
  getRecomendaciones: async (docenteId) => {
    const res = await apiFetch(`/docentes/${docenteId}/recomendaciones`)
    if (!res.ok) throw new Error(`recomendaciones ${res.status}`)
    return res.json()
  },

  // Stats (totals)
  getStats: async (docenteId) => {
    return apiJson(`/docentes/${docenteId}/stats`, undefined, 'stats fetch')
  },

  // Weekly stats — single endpoint replaces 7 separate calls in StatsCard
  getStatsSemanal: async (docenteId) => {
    const res = await apiFetch(`/docentes/${docenteId}/stats-semanal`)
    if (!res.ok) throw new Error(`stats-semanal ${res.status}`)
    return res.json()
  },

  // Normas
  getNormas: async (tipo) => {
    const url = tipo ? `/normas?tipo=${tipo}` : '/normas'
    return apiJson(url, undefined, 'normas fetch')
  },

  // Calendar summary
  getCalendarSummary: async (docenteId, mes, anio) => {
    return apiJson(`/docentes/${docenteId}/calendar-summary?mes=${mes}&anio=${anio}`, undefined, 'calendar summary fetch')
  },

  // Evaluaciones
  getEvaluaciones: async (docenteId, { mes, anio, fecha } = {}) => {
    const params = fecha ? `fecha=${fecha}` : `mes=${mes}&anio=${anio}`
    return apiJson(`/docentes/${docenteId}/evaluaciones?${params}`, undefined, 'evaluaciones fetch')
  },
  createEvaluacion: async (docenteId, data) => {
    return apiJson(`/docentes/${docenteId}/evaluaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'evaluacion create')
  },
  deleteEvaluacion: async (id) => {
    return apiJson(`/evaluaciones/${id}`, { method: 'DELETE' }, 'evaluacion delete')
  },

  // Alumnos
  getAlumnos: async (docenteId, filters = {}) => {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v]) => v))).toString()
    return apiJson(`/docentes/${docenteId}/alumnos${params ? '?' + params : ''}`, undefined, 'alumnos fetch')
  },
  createAlumno: async (docenteId, data) => {
    return apiJson(`/docentes/${docenteId}/alumnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'alumno create')
  },
  updateAlumno: async (id, data) => {
    return apiJson(`/alumnos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'alumno update')
  },
  deleteAlumno: async (id) => {
    return apiJson(`/alumnos/${id}`, { method: 'DELETE' }, 'alumno delete')
  },
  getDiagnosticos: async (alumnoId) => {
    return apiJson(`/alumnos/${alumnoId}/diagnosticos`, undefined, 'diagnosticos fetch')
  },
  createDiagnostico: async (alumnoId, data) => {
    return apiJson(`/alumnos/${alumnoId}/diagnosticos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }, 'diagnostico create')
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
  const res = await apiFetch('/admin/documents', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return res.json()
}

export const getDocuments = async () => {
  if (DOCUMENTS_BACKEND === 'supabase') {
    const context = await getAuthenticatedDocumentContext()
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, source_type, file_path, processing_status, created_at, owner_user_id, school_id')
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Supabase documents read failed: ${error.message}`)
    return (data || [])
      .filter((row) => isDocumentInScope(row, context))
      .map(mapSupabaseDocumentToAdminShape)
  }

  const res = await apiFetch('/admin/documents')
  if (!res.ok) throw new Error(`Documents fetch failed (${res.status})`)
  return res.json()
}

export const deleteDocument = async (id) => {
  if (DOCUMENTS_BACKEND === 'supabase') {
    const context = await getAuthenticatedDocumentContext()
    const { data: row, error: readError } = await supabase
      .from('documents')
      .select('file_path, owner_user_id, school_id')
      .eq('id', id)
      .single()

    if (readError) throw new Error(`Supabase documents read failed: ${readError.message}`)
    if (!isDocumentInScope(row, context)) {
      throw new Error('Document out of scope for current user')
    }

    if (row?.file_path) {
      const { error: storageError } = await supabase.storage.from('documents').remove([row.file_path])
      if (storageError) throw new Error(`Supabase storage delete failed: ${storageError.message}`)
    }

    const { error: deleteError } = await supabase.from('documents').delete().eq('id', id)
    if (deleteError) throw new Error(`Supabase documents delete failed: ${deleteError.message}`)

    return { ok: true }
  }

  const res = await apiFetch(`/admin/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
  return res.json()
}

export const uploadDocumentToSupabase = async (file, categoria) => {
  const context = await getAuthenticatedDocumentContext()
  if (!isPrivilegedRole(context.role) && !context.schoolId) {
    throw new Error('Missing school scope for document upload')
  }

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
      owner_user_id: context.userId,
      school_id: context.schoolId,
    })
    .select('id, title, source_type, file_path, processing_status, created_at, owner_user_id, school_id')
    .single()

  if (insertError) {
    await supabase.storage.from('documents').remove([path])
    throw new Error(`Supabase documents insert failed: ${insertError.message}`)
  }

  return mapSupabaseDocumentToAdminShape(createdRow)
}
