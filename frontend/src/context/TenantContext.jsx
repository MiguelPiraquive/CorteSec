import { createContext, useContext, useState, useEffect } from 'react'

const TenantContext = createContext(null)

export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export const TenantProvider = ({ children }) => {
  const [tenantCode, setTenantCode] = useState(null)
  const [tenantSlug, setTenantSlug] = useState(null)

  useEffect(() => {
    // Load tenant info from localStorage
    const storedTenantCode = localStorage.getItem('tenantCode')
    const storedTenantSlug = localStorage.getItem('tenantSlug')
    
    if (storedTenantCode) {
      setTenantCode(storedTenantCode)
    }
    
    if (storedTenantSlug) {
      setTenantSlug(storedTenantSlug)
    }
  }, [])

  const setTenant = (code, slug) => {
    setTenantCode(code)
    setTenantSlug(slug)
    
    if (code) {
      localStorage.setItem('tenantCode', code)
    }
    
    if (slug) {
      localStorage.setItem('tenantSlug', slug)
    }
  }

  const clearTenant = () => {
    setTenantCode(null)
    setTenantSlug(null)
    localStorage.removeItem('tenantCode')
    localStorage.removeItem('tenantSlug')
  }

  const value = {
    tenantCode,
    tenantSlug,
    setTenant,
    clearTenant,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
