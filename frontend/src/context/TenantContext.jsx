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
  const [tenant, setTenantObj] = useState(null)

  useEffect(() => {
    // Load tenant info from localStorage
    const storedTenantCode = localStorage.getItem('tenantCode')
    const storedTenantSlug = localStorage.getItem('tenantSlug')
    const storedTenant = localStorage.getItem('tenant')
    
    if (storedTenantCode) {
      setTenantCode(storedTenantCode)
    }
    
    if (storedTenantSlug) {
      setTenantSlug(storedTenantSlug)
    }

    if (storedTenant) {
      try {
        setTenantObj(JSON.parse(storedTenant))
      } catch { /* ignore */ }
    }
  }, [])

  const setTenant = (code, slug, tenantData = null) => {
    setTenantCode(code)
    setTenantSlug(slug)
    
    if (code) {
      localStorage.setItem('tenantCode', code)
    }
    
    if (slug) {
      localStorage.setItem('tenantSlug', slug)
    }

    if (tenantData) {
      setTenantObj(tenantData)
      localStorage.setItem('tenant', JSON.stringify(tenantData))
    } else if (code) {
      // Build minimal tenant object from code/slug
      const minimal = { codigo: code, slug, name: code }
      setTenantObj(minimal)
      localStorage.setItem('tenant', JSON.stringify(minimal))
    }
  }

  const clearTenant = () => {
    setTenantCode(null)
    setTenantSlug(null)
    setTenantObj(null)
    localStorage.removeItem('tenantCode')
    localStorage.removeItem('tenantSlug')
    localStorage.removeItem('tenant')
  }

  const value = {
    tenantCode,
    tenantSlug,
    tenant,
    setTenant,
    clearTenant,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
