export const AVISO_SHAPE = {
  id: '',
  title: '',
  body: '',
  author_role: '', // 'director' | 'admin' | 'supervisor'
  author_name: '',
  priority: '', // 'urgente' | 'normal' | 'informativo'
  target_scope: '', // 'all' | 'school' | 'grade'
  created_at: '',
  read_at: null,
  action_path: null, // ruta interna opcional
}

export const AVISOS_READ_KEY = 'profeia_avisos_read_v1'
export const DOCENTE_AVISOS_KEY = 'profeia_docente_avisos_v1'

export const AVISOS_STUB = [
  {
    id: 'aviso-001',
    title: 'Entrega de calificaciones — límite viernes',
    body: 'Recordatorio: la entrega de calificaciones del primer trimestre tiene como límite el viernes 30 de mayo. Favor de subir al sistema antes de las 14:00 hrs.',
    author_role: 'director',
    author_name: 'Dirección escolar',
    priority: 'urgente',
    target_scope: 'all',
    created_at: new Date().toISOString(),
    read_at: null,
    action_path: '/evaluacion',
  },
  {
    id: 'aviso-002',
    title: 'Nuevos libros de texto NEM disponibles',
    body: 'Ya están disponibles los libros de texto NEM para descarga en el portal SEP. Revisa los materiales de tu grado y actualiza tus planeaciones.',
    author_role: 'admin',
    author_name: 'Administración',
    priority: 'normal',
    target_scope: 'all',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read_at: null,
    action_path: '/admin',
  },
  {
    id: 'aviso-003',
    title: 'Reunión de consejo técnico — próximo lunes',
    body: 'Se convoca a todos los docentes a la reunión de consejo técnico el próximo lunes a las 9:00 hrs en la sala de usos múltiples.',
    author_role: 'director',
    author_name: 'Dirección escolar',
    priority: 'informativo',
    target_scope: 'all',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    read_at: null,
    action_path: null,
  },
]

export function getAvisosNoLeidos(avisos) {
  return avisos.filter((a) => !a.read_at)
}

export function marcarLeido(avisos, id) {
  return avisos.map((a) => (a.id === id ? { ...a, read_at: new Date().toISOString() } : a))
}

export function loadAvisosReadMap() {
  try {
    const raw = localStorage.getItem(AVISOS_READ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveAvisosReadMap(readMap) {
  localStorage.setItem(AVISOS_READ_KEY, JSON.stringify(readMap))
}

export function getAvisosLocalesDocente() {
  try {
    const raw = localStorage.getItem(DOCENTE_AVISOS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getMergedAvisos() {
  const readMap = loadAvisosReadMap()
  const base = [...AVISOS_STUB, ...getAvisosLocalesDocente()]

  return base
    .map((item) => ({
      ...item,
      read_at: readMap[item.id] || item.read_at || null,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
