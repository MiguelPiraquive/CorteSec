/**
 * BillingContext — CorteSec
 * 
 * Estado global de suscripción, features del plan y uso.
 * Disponible en toda la app para feature gating.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import billingService from '../services/billingService'
import { useAuth } from './AuthContext'

const BillingContext = createContext(null)

export const useBilling = () => {
  const context = useContext(BillingContext)
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return context
}

export const BillingProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth()

  const [subscription, setSubscription] = useState(null)
  const [features, setFeatures] = useState({})
  const [usage, setUsage] = useState(null)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar datos de billing al autenticar
  const loadBillingData = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null)
      setFeatures({})
      setUsage(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [subData, featuresData, usageData] = await Promise.all([
        billingService.getSubscription().catch(() => null),
        billingService.getPlanFeatures().catch(() => []),
        billingService.getUsage().catch(() => null),
      ])

      setSubscription(subData)
      setUsage(usageData)

      // Indexar features por código para acceso O(1)
      const featuresMap = {}
      const featuresList = Array.isArray(featuresData) ? featuresData : []
      featuresList.forEach(f => {
        featuresMap[f.feature_code] = {
          enabled: f.enabled,
          limit_value: f.limit_value,
          name: f.feature_name,
        }
      })
      setFeatures(featuresMap)
    } catch (err) {
      console.error('Error loading billing data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadBillingData()
  }, [loadBillingData])

  // Cargar planes (puede ser público)
  const loadPlans = useCallback(async () => {
    try {
      const data = await billingService.getPlans()
      setPlans(data.plans || [])
      return data
    } catch (err) {
      console.error('Error loading plans:', err)
      return { plans: [] }
    }
  }, [])

  // Refrescar datos después de una acción de billing
  const refreshBilling = useCallback(async () => {
    await loadBillingData()
  }, [loadBillingData])

  // Helpers
  const isTrialing = subscription?.is_trialing || false
  const isActive = subscription?.is_active || false
  const isExpired = subscription?.is_expired || false
  const allowsWrites = subscription?.allows_writes ?? true
  const daysRemaining = subscription?.days_remaining ?? null
  const currentPlan = subscription?.plan_code || 'FREE'

  const hasFeature = useCallback((featureCode) => {
    return features[featureCode]?.enabled ?? false
  }, [features])

  const getFeatureLimit = useCallback((featureCode) => {
    return features[featureCode]?.limit_value ?? null
  }, [features])

  const isOwner = user?.organization_role === 'OWNER'

  const value = {
    // State
    subscription,
    features,
    usage,
    plans,
    loading,
    error,

    // Computed
    isTrialing,
    isActive,
    isExpired,
    allowsWrites,
    daysRemaining,
    currentPlan,
    isOwner,

    // Methods  
    hasFeature,
    getFeatureLimit,
    loadPlans,
    refreshBilling,
  }

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  )
}
