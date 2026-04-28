import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

const DOCENTE_MAP_STORAGE_KEY = 'profeia_docente_map_v1'

function loadDocenteMap() {
  try {
    const raw = localStorage.getItem(DOCENTE_MAP_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDocenteMap(map) {
  localStorage.setItem(DOCENTE_MAP_STORAGE_KEY, JSON.stringify(map))
}

export function useCurrentDocente() {
  const { userProfile } = useAuth()
  const [docentes, setDocentes] = useState([])
  const [docente, setDocente] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sourceUnavailable, setSourceUnavailable] = useState(false)

  useEffect(() => {
    let active = true

    const hydrate = async () => {
      if (!userProfile?.id) {
        if (!active) return
        setDocentes([])
        setDocente(null)
        setLoading(false)
        setSourceUnavailable(false)
        return
      }

      setLoading(true)
      try {
        const list = await api.getDocentes()
        if (!active) return

        const safeList = Array.isArray(list) ? list : []
        setDocentes(safeList)
        setSourceUnavailable(false)

        const docenteMap = loadDocenteMap()
        const mappedId = Number(docenteMap[userProfile.id]) || null
        const mappedDocente = mappedId
          ? safeList.find((item) => Number(item?.id) === mappedId) || null
          : null

        if (safeList.length === 1) {
          const onlyDocente = safeList[0]
          setDocente(onlyDocente)
          saveDocenteMap({
            ...docenteMap,
            [userProfile.id]: Number(onlyDocente?.id),
          })
          setLoading(false)
          return
        }

        if (safeList.length > 1) {
          // For privileged/multi-docente sessions we force explicit selection
          // to avoid accidentally writing records under the wrong docente.
          setDocente(null)
          setLoading(false)
          return
        }

        if (mappedDocente) {
          setDocente(mappedDocente)
          setLoading(false)
          return
        }

        setDocente(null)
      } catch {
        if (!active) return
        setDocentes([])
        setDocente(null)
        setSourceUnavailable(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    void hydrate()

    return () => {
      active = false
    }
  }, [userProfile?.id])

  const selectDocente = (docenteId) => {
    const selected = docentes.find((item) => Number(item?.id) === Number(docenteId)) || null
    setDocente(selected)

    if (!selected || !userProfile?.id) return

    const docenteMap = loadDocenteMap()
    saveDocenteMap({
      ...docenteMap,
      [userProfile.id]: Number(selected.id),
    })
  }

  const selectionRequired = useMemo(
    () => docentes.length > 1 && !docente,
    [docentes.length, docente]
  )

  return {
    docente,
    docentes,
    loading,
    sourceUnavailable,
    selectionRequired,
    selectDocente,
  }
}
