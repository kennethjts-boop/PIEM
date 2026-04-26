import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type UserRole = 'teacher' | 'director' | 'admin' | 'superadmin'

export interface UserProfile {
  id: string
  name: string
  role: UserRole
  school_id: string | null
  email: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  userRole: UserRole | null
  authError: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const userRole: UserRole | null = userProfile?.role ?? null

  useEffect(() => {
    let mounted = true

    const resolveProfile = async (activeSession: Session | null) => {
      if (!mounted) return

      setSession(activeSession)
      setUser(activeSession?.user ?? null)

      if (!activeSession?.user) {
        setUserProfile(null)
        setAuthError(null)
        setLoading(false)
        return
      }

      const activeUser = activeSession.user

      const applyProfile = (profile: UserProfile) => {
        if (!mounted) return
        setUserProfile(profile)
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, school_id, email')
        .eq('id', activeUser.id)
        .single()

      if (!error && data) {
        setAuthError(null)
        applyProfile(data as UserProfile)
        setLoading(false)
        return
      }

      const isProfileNotFound = error?.code === 'PGRST116'
      if (!isProfileNotFound) {
        const message = `Error loading user profile: ${error?.message || 'unknown error'}`
        console.error(message, error)
        setAuthError(message)
        setLoading(false)
        return
      }

      const userName =
        activeUser.user_metadata?.full_name ||
        activeUser.user_metadata?.name ||
        activeUser.email?.split('@')[0] ||
        'Docente'

      const { data: createdData, error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: activeUser.id,
            email: activeUser.email,
            name: userName,
            role: 'teacher',
          },
          { onConflict: 'id' }
        )
        .select('id, name, role, school_id, email')
        .single()

      if (upsertError) {
        console.error('Error creating user profile:', upsertError.message)
        setAuthError(`Error creating user profile: ${upsertError.message}`)
      } else if (createdData) {
        setAuthError(null)
        applyProfile(createdData as UserProfile)
      }

      setLoading(false)
    }

    setLoading(true)
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      void resolveProfile(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setLoading(true)
        void resolveProfile(nextSession)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) console.error('Error Google OAuth:', error.message)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Error signOut:', error.message)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userProfile,
        userRole,
        authError,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return context
}
