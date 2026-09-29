import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { IS_LOCAL } from './db'

export interface AuthUser {
  email: string | null
}

export interface AuthBackend {
  /** False when no sign-in exists (demo mode). */
  readonly enabled: boolean
  subscribe(callback: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

const localAuth: AuthBackend = {
  enabled: false,
  subscribe(callback) {
    callback({ email: null })
    return () => {}
  },
  async signIn() {},
  async signOut() {},
}

const backend: Promise<AuthBackend> = IS_LOCAL
  ? Promise.resolve(localAuth)
  : import('./auth.firebase').then((m) => m.firebaseAuth)

interface AuthContextValue {
  loading: boolean
  user: AuthUser | null
  enabled: boolean
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: AuthUser | null; enabled: boolean }>({
    loading: true,
    user: null,
    enabled: !IS_LOCAL,
  })

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let cancelled = false
    backend.then((b) => {
      if (cancelled) return
      unsubscribe = b.subscribe((user) => setState({ loading: false, user, enabled: b.enabled }))
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: (email, password) => backend.then((b) => b.signIn(email, password)),
      signOut: () => backend.then((b) => b.signOut()),
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
