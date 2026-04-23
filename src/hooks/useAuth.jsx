'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('da_token')
    if (!token) {
      setLoading(false)
      return
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (data) setUser(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (password, side) => {
    const username = `${side}-admin`
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, side }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('da_token', data.token)
    setUser({ username: data.username, role: data.role, side: data.side })
    return data
  }

  const logout = () => {
    localStorage.removeItem('da_token')
    setUser(null)
  }

  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('da_token')
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    if (response.status === 401) {
      logout()
      throw new Error('Unauthorized')
    }

    return response
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAdmin: user?.role === 'admin',
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
