import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, Trash2, ArrowLeft,
  CheckCircle, Clock, AlertCircle, Settings, Save, ChevronDown
} from 'lucide-react'
import { uploadDocument, getDocuments, deleteDocument, getWebhookUrl, saveWebhookUrl, getDocumentsBackend } from '../api'

const CATEGORIAS = ['NEM', 'Leyes', 'Normas', 'Recursos', 'Planes de Estudio', 'Otro']

const ESTADO_ICON = {
  listo:       { icon: CheckCircle,  color: '#34A853', label: 'Listo' },
  procesando:  { icon: Clock,        color: '#FBBC04', label: 'Procesando' },
  error:       { icon: AlertCircle,  color: '#EA4335', label: 'Error' }
}

function AdminPanel() {
  const navigate = useNavigate()
  const documentsBackend = getDocumentsBackend()
  const isLocalDocumentsBackend = documentsBackend !== 'supabase'
  const [docs, setDocs] = useState([])
  const [categoria, setCategoria] = useState('NEM')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [documentsError, setDocumentsError] = useState(null)
  const [serverStatus, setServerStatus] = useState('checking')
  const [showConfig, setShowConfig] = useState(false)
  const [webhookInput, setWebhookInput] = useState('')
  const [webhookSaved, setWebhookSaved] = useState(false)

  const loadDocs = useCallback(async () => {
    try {
      const rows = await getDocuments()
      setDocs(Array.isArray(rows) ? rows : [])
      setDocumentsError(null)
      setServerStatus('online')
    } catch (err) {
      console.error('AdminPanel document load error:', err)
      setDocs([])
      setServerStatus('offline')
      if (isLocalDocumentsBackend) {
        setDocumentsError('Servidor local no disponible — inicia `profeia/server` para gestionar documentos')
      } else {
        setDocumentsError(err?.message || 'No se pudieron cargar los documentos en Supabase Storage')
      }
    }
  }, [isLocalDocumentsBackend])

  useEffect(() => {
    void loadDocs()
    setWebhookInput(getWebhookUrl())
  }, [loadDocs])

  const onDrop = useCallback(async (accepted) => {
    if (!accepted.length) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(accepted[0], categoria)
      await loadDocs()
    } catch (err) {
      setUploadError(err?.message || 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }, [categoria, loadDocs])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading
  })

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await deleteDocument(id)
      await loadDocs()
    } catch (err) {
      setUploadError(err?.message || 'No se pudo eliminar el documento')
    }
  }

  const statusBadge = {
    checking: {
      label: '🟡 Verificando servidor',
      color: '#9aa0a6',
      bg: '#f8f9fa',
      border: '#e8eaed',
    },
    online: {
      label: isLocalDocumentsBackend ? '🟢 Servidor conectado' : '🟢 Storage conectado',
      color: '#1E8E3E',
      bg: '#E6F4EA',
      border: '#CEEAD6',
    },
    offline: {
      label: isLocalDocumentsBackend ? '🔴 Servidor offline' : '🔴 Storage offline',
      color: '#C5221F',
      bg: '#FCE8E6',
      border: '#F6C7C4',
    },
  }[serverStatus]

  const handleSaveWebhook = () => {
    saveWebhookUrl(webhookInput)
    setWebhookSaved(true)
    setTimeout(() => setWebhookSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <header className="bg-white border-b border-[#e8eaed] px-6 py-3 flex items-center gap-4 sticky top-0 z-40">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-[#5f6368] hover:text-[#202124] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Profeia
        </button>
        <span className="text-[#e8eaed]">|</span>
        <h1 className="text-base font-bold text-[#202124]">Panel de Administración</h1>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-6">
          <h2 className="text-base font-bold text-[#202124] mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#4285F4]" />
            Subir documento PDF
          </h2>

          <div className="mb-4">
            <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">Categoría</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="input-google"
            >
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div
            {...getRootProps()}
            className={`admin-dropzone ${isDragActive ? 'admin-dropzone-active' : ''} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-[#4285F4]' : 'text-[#9aa0a6]'}`} />
            {uploading ? (
              <p className="text-sm text-[#4285F4] font-medium">Subiendo…</p>
            ) : isDragActive ? (
              <p className="text-sm text-[#4285F4] font-medium">Suelta el PDF aquí</p>
            ) : (
              <>
                <p className="text-sm text-[#5f6368]">
                  Arrastra un PDF aquí o <span className="text-[#4285F4] font-medium cursor-pointer">busca en tu equipo</span>
                </p>
                <p className="text-xs text-[#9aa0a6] mt-1">Solo PDF · Máximo 50 MB</p>
              </>
            )}
          </div>

          {uploadError && (
            <p className="text-sm text-[#EA4335] mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{uploadError}
            </p>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] p-6">
          <h2 className="text-base font-bold text-[#202124] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4285F4]" />
            Librería de documentos
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ color: statusBadge.color, background: statusBadge.bg, border: `1px solid ${statusBadge.border}` }}
            >
              {statusBadge.label}
            </span>
            <span className="ml-auto text-xs text-[#9aa0a6] font-normal">{docs.length} documentos</span>
          </h2>

          {documentsError && (
            <div className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ color: '#C5221F', borderColor: '#F6C7C4', background: '#FCE8E6' }}>
              {documentsError}
            </div>
          )}

          {docs.length === 0 ? (
            <div className="text-center py-10 text-[#9aa0a6]">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {documentsError
                  ? 'Sin conexión para listar documentos.'
                  : 'No hay documentos aún. Sube el primero arriba.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#f1f3f4] text-xs text-[#9aa0a6] uppercase tracking-wider">
                    <th className="text-left py-2 font-medium">Nombre</th>
                    <th className="text-left py-2 font-medium">Categoría</th>
                    <th className="text-left py-2 font-medium">Fecha</th>
                    <th className="text-left py-2 font-medium">Estado</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {docs.map(doc => {
                    const st = ESTADO_ICON[doc.estado] || ESTADO_ICON.procesando
                    const Icon = st.icon
                    return (
                      <tr key={doc.id} className="border-b border-[#f8f9fa] hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3 pr-4 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#EA4335] flex-shrink-0" />
                            <span className="truncate text-[#202124]">{doc.nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#4285F4]/10 text-[#4285F4]">
                            {doc.categoria}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[#5f6368] text-xs whitespace-nowrap">
                          {new Date(doc.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: st.color }}>
                            <Icon className="w-3.5 h-3.5" />{st.label}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-[#EA4335]/10 text-[#9aa0a6] hover:text-[#EA4335] transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-[#e8eaed] overflow-hidden">
          <button
            onClick={() => setShowConfig(c => !c)}
            className="w-full px-6 py-4 flex items-center gap-2 text-left hover:bg-[#f8f9fa] transition-colors"
          >
            <Settings className="w-4 h-4 text-[#9aa0a6]" />
            <h2 className="text-base font-bold text-[#202124]">Configuración del Asistente</h2>
            <ChevronDown className={`w-4 h-4 text-[#9aa0a6] ml-auto transition-transform ${showConfig ? 'rotate-180' : ''}`} />
          </button>

          {showConfig && (
            <div className="px-6 pb-6 pt-2 border-t border-[#f1f3f4]">
              <label className="block text-sm text-[#5f6368] mb-1.5 font-medium">
                URL del Webhook de ProfeIA (n8n)
              </label>
              <p className="text-xs text-[#9aa0a6] mb-3">
                Esta URL se usa para comunicar ProfeIA con tu flujo de n8n. Puedes cambiarla sin tocar el código.
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookInput}
                  onChange={e => setWebhookInput(e.target.value)}
                  className="input-google flex-1"
                  placeholder="https://n8n.tudominio.com/webhook/profeia-chat"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="btn-primary flex items-center gap-2 px-4 whitespace-nowrap"
                >
                  <Save className="w-4 h-4" />
                  {webhookSaved ? '¡Guardado!' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-[#9aa0a6] mt-2">
                Prioridad: valor guardado aquí {'>'} variable VITE_N8N_WEBHOOK_URL {'>'} URL de prueba.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default AdminPanel
