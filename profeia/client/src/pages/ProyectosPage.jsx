import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Plus, BookOpen, Calendar, CheckCircle, Clock, AlertCircle, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api'
import { useCurrentDocente } from '../lib/currentDocente'

const STATUS_COLORS = {
  planificacion: { bg: '#fef3c7', text: '#92400e', label: 'Planificación' },
  ejecucion: { bg: '#dbeafe', text: '#1e40af', label: 'En ejecución' },
  evaluacion: { bg: '#e9d5ff', text: '#6b21a8', label: 'Evaluación' },
  completado: { bg: '#d1fae5', text: '#065f46', label: 'Completado' },
  pausado: { bg: '#f3f4f6', text: '#374151', label: 'Pausado' }
}

export default function ProyectosPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { currentDocente, isLoading: loadingDocente } = useCurrentDocente()
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showDemoBadge, setShowDemoBadge] = useState(true)

  const isDemo = useMemo(() => {
    return currentDocente?.clave_escuela?.startsWith('DEMO-') || false
  }, [currentDocente])

  useEffect(() => {
    if (!currentDocente?.id) return

    const fetchProyectos = async () => {
      try {
        setLoading(true)
        const data = await api.getProyectos(currentDocente.id)
        setProyectos(data || [])
      } catch (error) {
        console.error('Error fetching proyectos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProyectos()
  }, [currentDocente?.id])

  const filteredProyectos = useMemo(() => {
    return proyectos.filter(p => {
      const matchesSearch = !searchTerm || 
        p.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tema?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = !statusFilter || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [proyectos, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const total = proyectos.length
    const activos = proyectos.filter(p => p.status === 'ejecucion').length
    const completados = proyectos.filter(p => p.status === 'completado').length
    const promedioProgreso = total > 0 
      ? Math.round(proyectos.reduce((acc, p) => acc + (p.progreso || 0), 0) / total)
      : 0
    return { total, activos, completados, promedioProgreso }
  }, [proyectos])

  if (loadingDocente || loading) {
    return (
      <div className="alumnos-page">
        <div className="alumnos-header">
          <button onClick={() => navigate('/dashboard')} className="alumnos-back">
            <ArrowLeft className="w-4 h-4" />Volver
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#202124]">Proyectos Pedagógicos</h1>
              <p className="text-xs text-[#9aa0a6]">Cargando...</p>
            </div>
          </div>
        </div>
        <div className="alumnos-body">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#4285F4] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[#5f6368]">Cargando proyectos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#202124]">Proyectos Pedagógicos</h1>
            <p className="text-xs text-[#9aa0a6]">Gestión de proyectos de aprendizaje</p>
          </div>
        </div>

        {isDemo && showDemoBadge && (
          <div className="hidden md:flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5" />
            Datos de DEMO
            <button onClick={() => setShowDemoBadge(false)} className="ml-1 hover:text-amber-900">×</button>
          </div>
        )}
      </header>

      <div className="alumnos-body space-y-4">
        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#202124]">{stats.total}</p>
                <p className="text-xs text-[#5f6368]">Total proyectos</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#202124]">{stats.activos}</p>
                <p className="text-xs text-[#5f6368]">En ejecución</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#202124]">{stats.completados}</p>
                <p className="text-xs text-[#5f6368]">Completados</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#202124]">{stats.promedioProgreso}%</p>
                <p className="text-xs text-[#5f6368]">Progreso promedio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9aa0a6]" />
              <input
                type="text"
                placeholder="Buscar proyecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#e8eaed] text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[#e8eaed] text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
            >
              <option value="">Todos los estados</option>
              <option value="planificacion">Planificación</option>
              <option value="ejecucion">En ejecución</option>
              <option value="evaluacion">Evaluación</option>
              <option value="completado">Completado</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProyectos.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[#202124] mb-2">
              {searchTerm ? 'No se encontraron proyectos' : 'No hay proyectos aún'}
            </h3>
            <p className="text-sm text-[#5f6368] mb-4">
              {searchTerm 
                ? 'Intenta con otros términos de búsqueda'
                : isDemo 
                  ? 'Los proyectos de DEMO aparecerán aquí. También puedes crear uno nuevo.'
                  : 'Crea tu primer proyecto pedagógico'
              }
            </p>
            <button 
              onClick={() => {}} // Would open create modal in full implementation
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4285F4] text-white rounded-lg text-sm font-medium hover:bg-[#3367d6] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProyectos.map((proyecto) => {
              const statusStyle = STATUS_COLORS[proyecto.status] || STATUS_COLORS.planificacion
              return (
                <div key={proyecto.id} className="glass-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                    >
                      {statusStyle.label}
                    </span>
                    <span className="text-xs text-[#9aa0a6] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {proyecto.created_at 
                        ? new Date(proyecto.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
                        : 'Sin fecha'}
                    </span>
                  </div>

                  <h3 className="font-semibold text-[#202124] mb-1 line-clamp-2">
                    {proyecto.titulo}
                  </h3>
                  <p className="text-sm text-[#5f6368] mb-2">{proyecto.tema}</p>

                  {proyecto.descripcion && (
                    <p className="text-sm text-[#5f6368] mb-3 line-clamp-2">
                      {proyecto.descripcion}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[#5f6368] mb-1">
                      <span>Progreso</span>
                      <span>{proyecto.progreso || 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#4285F4] rounded-full transition-all"
                        style={{ width: `${proyecto.progreso || 0}%` }}
                      />
                    </div>
                  </div>

                  {isDemo && (
                    <div className="mt-3 pt-3 border-t border-[#e8eaed]">
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <AlertCircle className="w-3 h-3" />
                        DEMO
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Demo hint */}
        {isDemo && proyectos.length > 0 && (
          <div className="glass-card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Proyectos de DEMO</p>
                <p className="text-sm text-amber-700">
                  Estos proyectos son datos de prueba. Puedes preguntar a ProfeIA: 
                  "qué proyectos tengo" o "explica el proyecto del ciclo del agua".
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
