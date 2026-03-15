/**
 * UpgradePage — CorteSec
 *
 * Comparación de planes + toggle mensual/anual + selección.
 * Estilo glassmorphism consistente con el resto del dashboard.
 */
import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  PackageIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ZapIcon,
  CheckCircleIcon,
  GridIcon,
} from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { usePermissions } from '../../context/PermissionsContext'
import PricingCard from '../../components/billing/PricingCard'
import PlanComparisonTable from '../../components/billing/PlanComparisonTable'

const UpgradePage = () => {
  const navigate = useNavigate()
  const { plans, currentPlan, loadPlans, loading } = useBilling()
  const { hasPermission, initialized } = usePermissions()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    const load = async () => {
      await loadPlans()
      setLoadingPlans(false)
    }
    load()
  }, [loadPlans])

  const handleSelectPlan = (plan) => {
    if (plan.code === 'ENTERPRISE') {
      window.open('mailto:ventas@cortesec.com?subject=Cotización Plan Enterprise', '_blank')
      return
    }
    navigate(`/dashboard/billing/checkout?plan=${plan.code}&cycle=${billingCycle}`)
  }

  /* ─── Loading ─── */
  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('billing.checkout')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  if (loadingPlans || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Cargando planes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <PackageIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Elige tu plan</h1>
              <p className="text-purple-100 mt-1 text-lg">
                Escala tu negocio con el plan que mejor se adapte a tus necesidades
              </p>
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

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-200 text-sm">Plan actual</div>
                <div className="text-2xl font-bold mt-0.5">{currentPlan || 'FREE'}</div>
              </div>
              <SparklesIcon className="w-8 h-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-200 text-sm">Planes disponibles</div>
                <div className="text-2xl font-bold mt-0.5">{plans.length}</div>
              </div>
              <GridIcon className="w-8 h-8 text-cyan-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-purple-200 text-sm">Incluye</div>
                <div className="text-lg font-bold mt-0.5">Soporte + Updates</div>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-300" />
            </div>
          </div>
        </div>

        {/* ─── Billing Cycle Toggle (inside hero) ─── */}
        <div className="flex items-center justify-center gap-4 mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-4 max-w-md mx-auto">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              billingCycle === 'monthly'
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              billingCycle === 'yearly'
                ? 'bg-white text-indigo-600 shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Anual
          </button>
          {billingCycle === 'yearly' && (
            <span className="px-3 py-1 bg-green-400/30 text-green-100 text-xs font-bold rounded-full border border-green-300/30">
              -17% descuento
            </span>
          )}
        </div>
      </div>

      {/* ─── Pricing Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(plan => (
          <PricingCard
            key={plan.code}
            plan={plan}
            billingCycle={billingCycle}
            currentPlan={currentPlan}
            isPopular={plan.code === 'PRO'}
            onSelect={handleSelectPlan}
          />
        ))}
      </div>

      {/* ─── Comparison Table ─── */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200/50">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl">
              <ZapIcon className="w-5 h-5 text-purple-600" />
            </div>
            Comparación detallada
          </h2>
          <p className="text-sm text-gray-500 mt-1">Todas las características incluidas en cada plan</p>
        </div>
        <PlanComparisonTable plans={plans} currentPlan={currentPlan} />
      </div>
    </div>
  )
}

export default UpgradePage
