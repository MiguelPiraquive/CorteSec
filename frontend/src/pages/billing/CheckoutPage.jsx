/**
 * CheckoutPage — CorteSec
 *
 * Flujo de checkout completo: selección → datos → pago → confirmación.
 * Integración con Wompi (tarjeta, PSE, Nequi) para pagos reales.
 * Estilo glassmorphism consistente con el resto del dashboard.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  CheckCircleIcon,
  LockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CreditCardIcon,
  BuildingIcon,
  ShoppingCartIcon,
  PackageIcon,
  ReceiptIcon,
  UsersIcon,
  HardDriveIcon,
  StarIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckIcon,
  AlertCircleIcon,
  LoaderIcon,
  XCircleIcon,
  BanknoteIcon,
  SmartphoneIcon,
  WalletIcon,
} from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { usePermissions } from '../../context/PermissionsContext'
import billingService from '../../services/billingService'

/* ─── Helpers ─── */
const formatCOP = (value) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const PLAN_COLORS = {
  BASIC: { from: 'from-green-400', to: 'to-emerald-500', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', ring: 'ring-green-200', selected: 'border-green-500 bg-green-50' },
  PRO: { from: 'from-blue-500', to: 'to-indigo-600', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', ring: 'ring-blue-200', selected: 'border-blue-500 bg-blue-50' },
  ENTERPRISE: { from: 'from-purple-500', to: 'to-pink-600', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', ring: 'ring-purple-200', selected: 'border-purple-500 bg-purple-50' },
}

const STEP_LABELS = [
  { num: 1, label: 'Plan', icon: PackageIcon },
  { num: 2, label: 'Datos', icon: BuildingIcon },
  { num: 3, label: 'Confirmar', icon: ShieldCheckIcon },
  { num: 4, label: 'Pago', icon: CreditCardIcon },
]

/* ─── Component ─── */
const CheckoutPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { plans, loadPlans, currentPlan, refreshBilling } = useBilling()
  const { hasPermission, initialized } = usePermissions()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [paymentFailed, setPaymentFailed] = useState(false)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState(null) // 'pending' | 'processing' | 'succeeded' | 'failed'
  const [wompiReference, setWompiReference] = useState('')
  const pollingRef = useRef(null)
  const wompiScriptLoaded = useRef(false)

  const [selectedPlan, setSelectedPlan] = useState(null)
  const [billingCycle, setBillingCycle] = useState(searchParams.get('cycle') || 'monthly')
  const [formData, setFormData] = useState({
    billing_name: '',
    billing_nit: '',
    billing_address: '',
    billing_email: '',
  })

  // Cargar script de Wompi
  useEffect(() => {
    if (wompiScriptLoaded.current) return
    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.async = true
    script.onload = () => { wompiScriptLoaded.current = true }
    document.head.appendChild(script)
    return () => {
      // No removemos el script al desmontar para evitar problemas
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Cargar planes
  useEffect(() => {
    const load = async () => {
      const data = await loadPlans()
      const planCode = searchParams.get('plan')
      if (planCode && data?.plans) {
        const found = data.plans.find(p => p.code === planCode)
        if (found) {
          setSelectedPlan(found)
          setStep(2)
        }
      }
      setLoading(false)
    }
    load()
  }, [loadPlans, searchParams])

  const price = selectedPlan
    ? (billingCycle === 'yearly' ? selectedPlan.price_yearly_cop : selectedPlan.price_monthly_cop)
    : 0
  const subtotal = price || 0
  const tax = Math.round(subtotal * 0.19)
  const total = subtotal + tax

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  // Polling de estado de pago
  const startPaymentPolling = useCallback((reference) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    let attempts = 0
    const maxAttempts = 60 // 5 minutos (cada 5 segundos)

    pollingRef.current = setInterval(async () => {
      attempts++
      try {
        const result = await billingService.checkoutStatus(reference)
        if (result.is_paid) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setPaymentStatus('succeeded')
          setSuccess(true)
          await refreshBilling()
        } else if (result.status === 'failed') {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setPaymentStatus('failed')
          setPaymentFailed(true)
          setError('El pago fue rechazado. Intenta con otro método de pago.')
        }
      } catch (err) {
        // Silenciar errores de polling
      }

      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
        setPaymentStatus('timeout')
        setError('El tiempo de espera se agotó. Si completaste el pago, aparecerá reflejado en unos minutos.')
      }
    }, 5000)
  }, [refreshBilling])

  // Abrir widget de Wompi
  const openWompiWidget = useCallback((config) => {
    if (typeof window.WidgetCheckout === 'undefined') {
      setError('El sistema de pagos no se cargó correctamente. Recarga la página e intenta de nuevo.')
      setSubmitting(false)
      return
    }

    const checkout = new window.WidgetCheckout({
      currency: config.currency,
      amountInCents: config.amount_in_cents,
      reference: config.reference,
      publicKey: config.public_key,
      redirectUrl: window.location.origin + '/dashboard/billing',
      customerData: {
        email: config.customer_email,
      },
    })

    checkout.open(function (result) {
      const transaction = result.transaction
      if (transaction) {
        if (transaction.status === 'APPROVED') {
          setPaymentStatus('succeeded')
          setSuccess(true)
          refreshBilling()
        } else if (transaction.status === 'DECLINED' || transaction.status === 'ERROR') {
          setPaymentStatus('failed')
          setPaymentFailed(true)
          setError('El pago fue rechazado. Intenta con otro método de pago.')
        } else {
          // PENDING o status intermedio → hacer polling
          setPaymentStatus('processing')
          startPaymentPolling(config.reference)
        }
      } else {
        // Usuario cerró el widget sin completar
        setPaymentStatus(null)
        setStep(3)
        setSubmitting(false)
      }
    })
  }, [refreshBilling, startPaymentPolling])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    setPaymentFailed(false)
    try {
      const result = await billingService.checkout({
        plan_code: selectedPlan.code,
        billing_cycle: billingCycle,
        billing_name: formData.billing_name,
        billing_nit: formData.billing_nit,
        billing_address: formData.billing_address,
        billing_email: formData.billing_email,
      })

      if (result.requires_payment && result.gateway === 'wompi') {
        // Flujo Wompi: ir a paso 4 y abrir widget
        setStep(4)
        setWompiReference(result.wompi_config.reference)
        setPaymentStatus('pending')

        // Pequeño delay para que la UI se actualice antes de abrir el widget
        setTimeout(() => {
          openWompiWidget(result.wompi_config)
        }, 500)

        // También iniciar polling como respaldo
        startPaymentPolling(result.wompi_config.reference)

      } else if (result.requires_payment && result.gateway === 'stripe') {
        // Flujo Stripe (futuro)
        setError('Stripe no está configurado. Contacta al administrador.')
        setSubmitting(false)

      } else {
        // Flujo manual (dev) — pago instantáneo
        setSuccess(true)
        await refreshBilling()
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error procesando el pago.')
      setSubmitting(false)
    }
  }

  const planColor = PLAN_COLORS[selectedPlan?.code] || PLAN_COLORS.BASIC

  /* ─── Permissions ─── */
  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('billing.checkout')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Cargando checkout...</span>
        </div>
      </div>
    )
  }

  /* ─── Success State ─── */
  if (success) {
    return (
      <div className="space-y-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-bold mb-3">¡Plan activado!</h1>
            <p className="text-green-100 text-lg max-w-md mx-auto">
              Tu plan <strong>{selectedPlan.name}</strong> ha sido activado exitosamente.
              Ya puedes disfrutar de todas las funcionalidades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <PackageIcon className="w-6 h-6 mx-auto mb-2 text-green-200" />
              <p className="text-green-200 text-xs">Plan</p>
              <p className="text-lg font-bold">{selectedPlan.name}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <ReceiptIcon className="w-6 h-6 mx-auto mb-2 text-green-200" />
              <p className="text-green-200 text-xs">Total pagado</p>
              <p className="text-lg font-bold">{formatCOP(total)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
              <CreditCardIcon className="w-6 h-6 mx-auto mb-2 text-green-200" />
              <p className="text-green-200 text-xs">Ciclo</p>
              <p className="text-lg font-bold">{billingCycle === 'yearly' ? 'Anual' : 'Mensual'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="flex items-center space-x-2 px-8 py-3 bg-white text-emerald-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg border-2 border-gray-200"
          >
            <ArrowRightIcon className="w-5 h-5" />
            <span>Ir a facturación</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <ShoppingCartIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Checkout</h1>
              <p className="text-blue-100 mt-1 text-lg">Completa tu suscripción en 3 simples pasos</p>
            </div>
          </div>
          <Link
            to="/dashboard/billing"
            className="flex items-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border-2 border-white/30"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Volver</span>
          </Link>
        </div>

        {/* ─── Steps Indicator ─── */}
        <div className="flex items-center justify-center gap-0 mt-8">
          {STEP_LABELS.map((s, i) => {
            const StepIcon = s.icon
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-2xl text-sm font-bold transition-all duration-300 ${
                      isDone
                        ? 'bg-white text-indigo-600 shadow-lg'
                        : isActive
                        ? 'bg-white/30 backdrop-blur-sm text-white border-2 border-white/50 shadow-lg'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {isDone ? <CheckIcon className="w-6 h-6" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${
                    isActive || isDone ? 'text-white' : 'text-white/40'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`w-16 h-0.5 mx-2 mt-[-18px] rounded-full transition-all duration-300 ${
                    isDone ? 'bg-white' : 'bg-white/20'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Main Content (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ═══ Step 1: Select Plan ═══ */}
          {step === 1 && (
            <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <PackageIcon className="w-5 h-5 text-indigo-600" />
                </div>
                Selecciona tu plan
              </h2>

              {/* Cycle toggle */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    billingCycle === 'monthly'
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    billingCycle === 'yearly'
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300 shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Anual
                </button>
                {billingCycle === 'yearly' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
                    -17% descuento
                  </span>
                )}
              </div>

              {/* Plan options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.filter(p => p.code !== 'FREE' && p.price_monthly_cop !== null).map(plan => {
                  const planPrice = billingCycle === 'yearly' ? plan.price_yearly_cop : plan.price_monthly_cop
                  const isSelected = selectedPlan?.code === plan.code
                  const color = PLAN_COLORS[plan.code] || PLAN_COLORS.BASIC
                  return (
                    <button
                      key={plan.code}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative text-left border-2 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg ${
                        isSelected
                          ? `${color.selected} ring-2 ${color.ring} shadow-md`
                          : 'border-gray-200/80 bg-white/80 hover:border-gray-300'
                      }`}
                    >
                      {plan.code === 'PRO' && (
                        <span className="absolute -top-2.5 right-3 flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
                          <StarIcon className="w-3 h-3" /> Popular
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`h-9 w-9 rounded-xl ${color.bg} ${color.text} flex items-center justify-center`}>
                          <PackageIcon className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-800">{plan.name}</h3>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{formatCOP(planPrice)}</p>
                      <p className="text-sm text-gray-500">/{billingCycle === 'yearly' ? 'año' : 'mes'}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                          <UsersIcon className="w-3 h-3 inline mr-1" />{plan.max_users} usuarios
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                          <HardDriveIcon className="w-3 h-3 inline mr-1" />{plan.max_storage_mb >= 1024 ? `${plan.max_storage_mb / 1024} GB` : `${plan.max_storage_mb} MB`}
                        </span>
                      </div>
                      {isSelected && (
                        <div className={`absolute top-3 left-3 w-6 h-6 rounded-full ${color.bg} ${color.text} flex items-center justify-center`}>
                          <CheckIcon className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200/50">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedPlan}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  <span>Continuar</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ Step 2: Billing Data ═══ */}
          {step === 2 && (
            <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <BuildingIcon className="w-5 h-5 text-amber-600" />
                </div>
                Datos de facturación
              </h2>

              <p className="text-sm text-gray-500 mb-6">Estos datos aparecerán en tu factura electrónica.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Razón social *</label>
                  <input
                    type="text"
                    name="billing_name"
                    value={formData.billing_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Empresa SAS"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">NIT *</label>
                  <input
                    type="text"
                    name="billing_nit"
                    value={formData.billing_nit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="900123456-7"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email de facturación *</label>
                  <input
                    type="email"
                    name="billing_email"
                    value={formData.billing_email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="contabilidad@empresa.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    name="billing_address"
                    value={formData.billing_address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Calle 100 #15-20, Bogotá"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6 pt-4 border-t border-gray-200/50">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-5 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-semibold"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver</span>
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.billing_name || !formData.billing_nit || !formData.billing_email}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  <span>Revisar pedido</span>
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* ═══ Step 3: Confirm ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Order summary */}
              <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <ReceiptIcon className="w-5 h-5 text-green-600" />
                  </div>
                  Resumen del pedido
                </h2>

                <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-5 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-11 w-11 rounded-xl ${planColor.bg} ${planColor.text} flex items-center justify-center flex-shrink-0`}>
                      <PackageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{selectedPlan?.name}</h3>
                      <p className="text-xs text-gray-500">
                        {billingCycle === 'yearly' ? 'Facturación anual' : 'Facturación mensual'} · {selectedPlan?.max_users} usuarios · {selectedPlan?.max_storage_mb >= 1024 ? `${selectedPlan.max_storage_mb / 1024} GB` : `${selectedPlan?.max_storage_mb} MB`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-800">{formatCOP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>IVA (19%)</span>
                      <span className="font-semibold text-gray-800">{formatCOP(tax)}</span>
                    </div>
                    <div className="border-t-2 border-gray-200 pt-3 flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatCOP(total)} <span className="text-sm font-normal text-gray-500">COP</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing info summary */}
              <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                  <div className="bg-amber-100 p-2 rounded-xl">
                    <BuildingIcon className="w-4 h-4 text-amber-600" />
                  </div>
                  Datos de facturación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Razón social</p>
                    <p className="text-sm font-bold text-gray-800">{formData.billing_name}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">NIT</p>
                    <p className="text-sm font-bold text-gray-800">{formData.billing_nit}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm font-bold text-gray-800">{formData.billing_email}</p>
                  </div>
                  {formData.billing_address && (
                    <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Dirección</p>
                      <p className="text-sm font-bold text-gray-800">{formData.billing_address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="backdrop-blur-xl bg-red-500/90 border border-red-400 text-white rounded-2xl shadow-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircleIcon className="w-6 h-6" />
                    <span className="font-semibold">{error}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-2 px-5 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all font-semibold"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>Volver</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center space-x-2 px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg transform hover:scale-105 duration-300"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <LockIcon className="w-5 h-5" />
                      <span>Pagar {formatCOP(total)}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <LockIcon className="w-3 h-3" />
                  <span>Encriptación 256-bit</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <ShieldCheckIcon className="w-3 h-3" />
                  <span>Pago seguro</span>
                </div>
                <span>·</span>
                <div className="flex items-center gap-1">
                  <CreditCardIcon className="w-3 h-3" />
                  <span>PCI-DSS compliant</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Payment Processing ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-8 border border-gray-200/50">
                {paymentStatus === 'pending' || paymentStatus === 'processing' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <LoaderIcon className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      {paymentStatus === 'pending' ? 'Abriendo pasarela de pago...' : 'Verificando tu pago...'}
                    </h2>
                    <p className="text-gray-500 max-w-md mx-auto">
                      {paymentStatus === 'pending'
                        ? 'El formulario de pago de Wompi se abrirá en unos segundos. Completa el pago con tu tarjeta, PSE o Nequi.'
                        : 'Estamos esperando la confirmación de tu pago. Esto puede tardar unos segundos.'}
                    </p>

                    {/* Métodos de pago aceptados */}
                    <div className="mt-8 flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-200">
                          <CreditCardIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-500">Tarjeta</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center border border-green-200">
                          <BanknoteIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs text-gray-500">PSE</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-200">
                          <SmartphoneIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <span className="text-xs text-gray-500">Nequi</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200">
                          <WalletIcon className="w-6 h-6 text-amber-600" />
                        </div>
                        <span className="text-xs text-gray-500">Bancolombia</span>
                      </div>
                    </div>

                    {paymentStatus === 'pending' && (
                      <button
                        onClick={() => {
                          if (wompiReference) {
                            openWompiWidget({
                              currency: 'COP',
                              amount_in_cents: parseInt(total * 100),
                              reference: wompiReference,
                              public_key: '', // Se obtiene del checkout
                              customer_email: formData.billing_email,
                            })
                          }
                        }}
                        className="mt-6 px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all font-semibold text-sm"
                      >
                        Abrir pasarela de pago nuevamente
                      </button>
                    )}
                  </div>
                ) : paymentStatus === 'failed' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <XCircleIcon className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Pago rechazado</h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      Tu pago no pudo ser procesado. Verifica los datos de tu tarjeta o intenta con otro método de pago.
                    </p>
                    <button
                      onClick={() => {
                        setStep(3)
                        setPaymentStatus(null)
                        setPaymentFailed(false)
                        setError('')
                        setSubmitting(false)
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-semibold shadow-lg"
                    >
                      Intentar de nuevo
                    </button>
                  </div>
                ) : paymentStatus === 'timeout' ? (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircleIcon className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Tiempo de espera agotado</h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      No pudimos confirmar tu pago aún. Si completaste el pago, este se reflejará en unos minutos automáticamente.
                    </p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => navigate('/dashboard/billing')}
                        className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                      >
                        Ir a facturación
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* ─── Sidebar: Order Summary (persistent) ─── */}
        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden sticky top-6">
            {selectedPlan ? (
              <>
                <div className={`bg-gradient-to-r ${planColor.from} ${planColor.to} p-5 text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Tu selección</p>
                      <p className="text-2xl font-bold mt-1">{selectedPlan.name}</p>
                    </div>
                    <SparklesIcon className="w-8 h-8 text-white/40" />
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Ciclo</span>
                    <span className="font-semibold text-gray-800">
                      {billingCycle === 'yearly' ? 'Anual' : 'Mensual'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Usuarios</span>
                    <span className="font-semibold text-gray-800">{selectedPlan.max_users}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Storage</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPlan.max_storage_mb >= 1024 ? `${selectedPlan.max_storage_mb / 1024} GB` : `${selectedPlan.max_storage_mb} MB`}
                    </span>
                  </div>

                  <div className="border-t-2 border-gray-200 pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatCOP(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>IVA (19%)</span>
                      <span className="font-semibold">{formatCOP(tax)}</span>
                    </div>
                    <div className="border-t-2 border-gray-200 pt-3 flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900">{formatCOP(total)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <PackageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Selecciona un plan</p>
                <p className="text-xs text-gray-400 mt-1">Elige el plan que mejor se adapte a tu negocio</p>
              </div>
            )}
          </div>

          {/* Security badges */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🔒 Pago seguro</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Datos encriptados con SSL de 256-bit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>No almacenamos datos de tarjeta</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Certificación PCI-DSS Level 1</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Cancela en cualquier momento</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
