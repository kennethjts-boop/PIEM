const TAREAS_KEY = 'profeia_tareas_v1'

export const TAREA_SHAPE = {
  id: '',
  titulo: '',
  prioridad: '', // 'urgente' | 'normal'
  created_at: '',
  done: false,
  action_path: null, // ruta interna opcional
  source: 'agent', // 'agent' | 'manual'
}

export function getTareasLocales() {
  try {
    const raw = localStorage.getItem(TAREAS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addTareaLocal(tarea) {
  const tareas = getTareasLocales()
  const nueva = {
    id: `tarea-${Date.now()}`,
    created_at: new Date().toISOString(),
    done: false,
    source: 'agent',
    ...tarea,
  }
  localStorage.setItem(TAREAS_KEY, JSON.stringify([nueva, ...tareas]))
  window.dispatchEvent(new CustomEvent('profeia:tareas-updated'))
  return nueva
}

export function marcarTareaHecha(id) {
  const tareas = getTareasLocales()
  const updated = tareas.map((t) => (t.id === id ? { ...t, done: true } : t))
  localStorage.setItem(TAREAS_KEY, JSON.stringify(updated))
  window.dispatchEvent(new CustomEvent('profeia:tareas-updated'))
}

export function deleteTareaLocal(id) {
  const tareas = getTareasLocales()
  localStorage.setItem(TAREAS_KEY, JSON.stringify(tareas.filter((t) => t.id !== id)))
  window.dispatchEvent(new CustomEvent('profeia:tareas-updated'))
}
