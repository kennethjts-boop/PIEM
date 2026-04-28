import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { TIERS, getCurrentTier } from '../lib/tiers'
import { supabase } from '../lib/supabaseClient'

function formatRole(role) {
  if (!role) return 'teacher'
  return String(role).replace('_', ' ')
}

export default function PerfilPage() {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const [schoolName, setSchoolName] = useState('Sin escuela asignada')

  const displayName = userProfile?.name || 'Docente'
  const initials = useMemo(
    () => displayName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase(),
    [displayName]
  )

  const tierId = getCurrentTier(userProfile)
  const tier = TIERS[tierId]
  const createdDate = user?.created_at ? new Date(user.created_at) : null

  useEffect(() => {
    let active = true

    const resolveSchoolName = async () => {
      if (!userProfile?.school_id) {
        if (active) setSchoolName('Sin escuela asignada')
        return
      }

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('name')
          .eq('id', userProfile.school_id)
          .single()

        if (!active) return

        if (error || !data?.name) {
          setSchoolName('Escuela no disponible')
          return
        }

        setSchoolName(data.name)
      } catch {
        if (!active) return
        setSchoolName('Escuela no disponible')
      }
    }

    void resolveSchoolName()

    return () => {
      active = false
    }
  }, [userProfile?.school_id])

  return (
    <div className="alumnos-page">
      <header className="alumnos-header">
        <button onClick={() => navigate('/dashboard')} className="alumnos-back">
          <ArrowLeft className="w-4 h-4" />Volver
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#202124]">Mi perfil</h1>
          <p className="text-xs text-[#9aa0a6]">Información de tu cuenta docente</p>
        </div>
      </header>

      <div className="alumnos-body space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full text-white text-lg font-bold flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4285F4, #A142F4)' }}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#202124]">{displayName}</h2>
              <p className="text-sm text-[#5f6368]">{userProfile?.email || user?.email || 'Sin correo'}</p>
              <span className="inline-flex mt-2 rounded-full bg-[#eef5ff] text-[#2f68bb] border border-[#cfe2ff] px-2.5 py-0.5 text-[11px] font-semibold capitalize">
                {formatRole(userProfile?.role)}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-[#eef1f5] pt-4 text-sm text-[#5f6368]">
            <p>
              <span className="font-semibold text-[#374151]">Escuela:</span>{' '}
              {schoolName}
            </p>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#202124] mb-3">Plan actual</h3>
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: tier?.color || '#4285F4' }}
            >
              Tier {tierId} · {tier?.name || 'Básico'}
            </span>
            <Link to="/planes" className="btn-secondary text-xs py-2 px-3">
              Ver planes
            </Link>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-[#202124] mb-3">Cuenta</h3>
          <div className="space-y-2 text-sm text-[#5f6368]">
            <p>
              <span className="font-semibold text-[#374151]">ID de usuario:</span> {userProfile?.id || user?.id || 'N/A'}
            </p>
            <p>
              <span className="font-semibold text-[#374151]">Fecha de creación:</span>{' '}
              {createdDate ? createdDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No disponible'}
            </p>
          </div>
          <div className="mt-4 text-xs text-[#9aa0a6] flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />Gestiona tu suscripción desde la sección de planes.
          </div>
        </section>
      </div>
    </div>
  )
}
