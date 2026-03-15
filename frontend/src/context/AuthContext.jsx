import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import authService from '../services/authService'
import { resetSessionState, onSessionExpired } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // When the api interceptor detects a dead session (refresh failed),
  // this callback fires INSTANTLY to update React state
  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null)
      setIsAuthenticated(false)
    })
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getCurrentUser()
        if (storedUser) {
          const result = await authService.checkAuth()
          if (result.success && result.user) {
            resetSessionState()
            setUser(result.user)
            setIsAuthenticated(true)
          } else {
            localStorage.removeItem('user')
            localStorage.removeItem('tenantCode')
            localStorage.removeItem('tenantSlug')
            localStorage.removeItem('tenantName')
          }
        }
      } catch {
        localStorage.removeItem('user')
        localStorage.removeItem('tenantCode')
        localStorage.removeItem('tenantSlug')
        localStorage.removeItem('tenantName')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    try {
      resetSessionState()
      const response = await authService.login(email, password)

      if (response.success && response.user) {
        setUser(response.user)
        setIsAuthenticated(true)
        return response
      }

      throw new Error(response.message || 'Error en el login')
    } catch (error) {
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const updateUser = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
