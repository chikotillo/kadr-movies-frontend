import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (id) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    loadProfile(user.id)
  }, [user?.id, loadProfile])

  const reloadProfile = () => (user?.id ? loadProfile(user.id) : Promise.resolve())

  const signUp = (email, password, username) =>
    supabase.auth.signUp({ email, password, options: { data: { username } } })
  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, reloadProfile, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}