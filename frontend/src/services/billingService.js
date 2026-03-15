/**
 * Billing Service — CorteSec
 * 
 * API client para todos los endpoints de billing/suscripciones.
 */
import api from './api'

const billingService = {
  // ==================== PLANES ====================

  /** Obtener planes disponibles (público) */
  getPlans: async () => {
    const response = await api.get('/api/billing/plans/')
    return response.data
  },

  // ==================== SUSCRIPCIÓN ====================

  /** Obtener mi suscripción actual */
  getSubscription: async () => {
    const response = await api.get('/api/billing/subscription/')
    return response.data
  },

  /** Cancelar suscripción */
  cancelSubscription: async (reason = '') => {
    const response = await api.post('/api/billing/subscription/cancel/', { reason })
    return response.data
  },

  /** Reactivar suscripción (revertir cancelación) */
  reactivateSubscription: async () => {
    const response = await api.post('/api/billing/subscription/reactivate/')
    return response.data
  },

  // ==================== CHECKOUT ====================

  /** Iniciar checkout */
  checkout: async (data) => {
    const response = await api.post('/api/billing/checkout/', data)
    return response.data
  },

  /** Confirmar pago (después de 3D Secure) */
  confirmCheckout: async (paymentIntentId) => {
    const response = await api.post('/api/billing/checkout/confirm/', {
      payment_intent_id: paymentIntentId,
    })
    return response.data
  },

  /** Consultar estado del pago (polling después de Wompi) */
  checkoutStatus: async (reference) => {
    const response = await api.get(`/api/billing/checkout/status/?reference=${encodeURIComponent(reference)}`)
    return response.data
  },

  // ==================== MÉTODOS DE PAGO ====================

  /** Listar métodos de pago */
  getPaymentMethods: async () => {
    const response = await api.get('/api/billing/payment-methods/')
    return response.data?.results || response.data
  },

  /** Agregar método de pago (token de Stripe) */
  addPaymentMethod: async (paymentMethodToken) => {
    const response = await api.post('/api/billing/payment-methods/', {
      payment_method_token: paymentMethodToken,
    })
    return response.data
  },

  /** Eliminar método de pago */
  deletePaymentMethod: async (id) => {
    const response = await api.delete(`/api/billing/payment-methods/${id}/`)
    return response.data
  },

  /** Establecer método de pago como predeterminado */
  setDefaultPaymentMethod: async (id) => {
    const response = await api.post(`/api/billing/payment-methods/${id}/set-default/`)
    return response.data
  },

  // ==================== FACTURAS ====================

  /** Listar facturas */
  getInvoices: async () => {
    const response = await api.get('/api/billing/invoices/')
    return response.data?.results || response.data
  },

  /** Detalle de factura */
  getInvoice: async (id) => {
    const response = await api.get(`/api/billing/invoices/${id}/`)
    return response.data
  },

  /** Descargar PDF de factura */
  downloadInvoicePDF: async (id) => {
    const response = await api.get(`/api/billing/invoices/${id}/pdf/`, {
      responseType: 'blob',
    })
    // Crear link de descarga
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `factura_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return true
  },

  // ==================== USO / FEATURES ====================

  /** Obtener uso actual vs límites */
  getUsage: async () => {
    const response = await api.get('/api/billing/usage/')
    return response.data
  },

  /** Obtener features del plan actual */
  getPlanFeatures: async () => {
    const response = await api.get('/api/billing/plan-features/')
    return response.data?.results || response.data
  },
}

export default billingService
