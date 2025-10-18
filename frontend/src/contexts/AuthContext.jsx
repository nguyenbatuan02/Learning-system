import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import axios from 'axios'
import api from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const loadUserProfile = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const { data } = await api.get('/api/v1/users/me')
      setUser(data)
    } catch (error) {
      console.error('Failed to load user profile', error)
      }
  }

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      
      if (session) {
        await loadUserProfile()
      } else {
        setUser(null)
      }
      
      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || '',
            role: session.user.user_metadata?.role || 'user',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const register = async (email, password, fullName) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/register`,
        {
          email,
          password,
          full_name: fullName
        }
      )
      
      // Set session in Supabase
      await supabase.auth.setSession({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      })
      
      return { data: response.data, error: null }
    } catch (error) {
      return { data: null, error: error.response?.data?.detail || 'Registration failed' }
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/login`,
        {
          email,
          password
        }
      )
      
      // Set session in Supabase
      await supabase.auth.setSession({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      })
      
      return { data: response.data, error: null }
    } catch (error) {
      throw new Error('Login failed')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const updateUser = async (updates) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/v1/users/me`,
        updates
      )
      return { data: response.data, error: null }
    } catch (error) {
      return { data: null, error: 'Profile update failed' }
    }
  }

  const value = {
    user,
    session,
    loading,
    register,
    login,
    logout,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}