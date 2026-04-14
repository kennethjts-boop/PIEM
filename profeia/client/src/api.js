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

  // Stats
  getStats: async (docenteId) => {
    const res = await fetch(`${API_BASE}/docentes/${docenteId}/stats`)
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
  }
}
