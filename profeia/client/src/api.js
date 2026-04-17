const API_BASE = '/api'

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
export const uploadDocument = async (file, categoria) => {
  const form = new FormData()
  form.append('file', file)
  form.append('categoria', categoria)
  const res = await fetch('/api/admin/documents', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export const getDocuments = async () => {
  const res = await fetch('/api/admin/documents')
  return res.json()
}

export const deleteDocument = async (id) => {
  const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' })
  return res.json()
}
