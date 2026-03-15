/**
 * BillingDashboardPage — CorteSec
 *
 * Página principal de billing: suscripción + uso + acciones rápidas.
 * Estilo glassmorphism consistente con el resto del dashboard.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCardIcon,
  FileTextIcon,
  ArrowUpCircleIcon,
  CalendarIcon,
  UsersIcon,
  WalletIcon,
  PackageIcon,
  ReceiptIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  ClockIcon,
  SparklesIcon,
  ChevronRightIcon,
  DownloadIcon,
  ZapIcon,
} from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { usePermissions } from '../../context/PermissionsContext'
import SubscriptionStatus from '../../components/billing/SubscriptionStatus'
import UsageBar from '../../components/billing/UsageBar'
import TrialBanner from '../../components/billing/TrialBanner'
import InvoiceRow from '../../components/billing/InvoiceRow'
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

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const PLAN_ACCENT = {
  FREE: { from: 'from-gray-400', to: 'to-gray-500', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  BASIC: { from: 'from-green-400', to: 'to-emerald-500', badge: 'bg-green-100 text-green-700 border-green-200' },
  PRO: { from: 'from-blue-500', to: 'to-indigo-600', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  ENTERPRISE: { from: 'from-purple-500', to: 'to-pink-600', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
}

/* ─── Component ─── */
const BillingDashboardPage = () => {
  const {
    subscription, usage, isTrialing, isActive, daysRemaining,
    currentPlan, isOwner, loading,
  } = useBilling()
  const { hasPermission, initialized } = usePermissions()

  const [invoices, setInvoices] = useState([])
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const data = await billingService.getInvoices()
        setInvoices(Array.isArray(data) ? data.slice(0, 5) : [])
      } catch (err) {
        console.error('Error loading invoices:', err)
      } finally {
        setLoadingInvoices(false)
      }
    }
    loadInvoices()
  }, [])

  const accent = PLAN_ACCENT[currentPlan] || PLAN_ACCENT.FREE
  const usersCount = usage?.current_users || 0
  const usersLimit = usage?.max_users || 5
  const usersPercentage = usersLimit > 0 ? Math.round((usersCount / usersLimit) * 100) : 0

  /* ─── Loading ─── */
  if (!initialized || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Cargando facturación...</span>
        </div>
      </div>
    )
  }

  if (!hasPermission('billing.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  return (
    <div className="space-y-6">
      {/* ─── Trial Banner (above header) ─── */}
      <TrialBanner />

      {/* ─── Hero Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <WalletIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Facturación</h1>
              <p className="text-blue-100 mt-1 text-lg">Gestiona tu suscripción, pagos y facturas</p>
            </div>
          </div>
          {isOwner && hasPermission('billing.checkout') && (
            <Link
              to="/dashboard/billing/checkout"
              className="flex items-center space-x-2 px-5 py-3 bg-white text-indigo-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg"
            >
              <ArrowUpCircleIcon className="w-5 h-5" />
              <span>{currentPlan === 'FREE' ? 'Activar plan' : 'Cambiar plan'}</span>
            </Link>
          )}
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {/* Plan actual */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">Plan actual</div>
                <div className="text-2xl font-bold mt-0.5">{subscription?.plan_name || 'Sin plan'}</div>
              </div>
              <PackageIcon className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">Estado</div>
                <div className="mt-1.5">
                  <SubscriptionStatus status={subscription?.status} size="lg" />
                </div>
              </div>
              <ShieldCheckIcon className="w-8 h-8 text-green-300" />
            </div>
          </div>

          {/* Usuarios */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">Usuarios</div>
                <div className="text-2xl font-bold mt-0.5">
                  {usersCount} / {usersLimit === 9999 ? '∞' : usersLimit}
                </div>
              </div>
              <UsersIcon className="w-8 h-8 text-cyan-300" />
            </div>
          </div>

          {/* Periodo */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">
                  {isTrialing ? 'Trial termina' : 'Próximo ciclo'}
                </div>
                <div className="text-lg font-bold mt-0.5">
                  {daysRemaining !== null ? (
                    <>{daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}</>
                  ) : '-'}
                </div>
              </div>
              <CalendarIcon className="w-8 h-8 text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Left: Subscription + Usage (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─── Subscription Detail Card ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                </div>
                Tu suscripción
              </h2>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${accent.badge}`}>
                {currentPlan || 'FREE'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan info */}
              <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Plan</p>
                <p className="text-xl font-bold text-gray-800">
                  {subscription?.plan_name || 'Sin plan'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600 text-xs">
                    {subscription?.billing_cycle === 'yearly' ? '📅 Anual' : '📅 Mensual'}
                  </span>
                </div>
              </div>

              {/* Period dates */}
              <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {isTrialing ? 'Periodo de prueba' : 'Periodo actual'}
                </p>
                <p className="text-lg font-bold text-gray-800">
                  {formatDate(isTrialing ? subscription?.trial_end : subscription?.current_period_end)}
                </p>
                {daysRemaining !== null && (
                  <div className="mt-3 flex items-center gap-2">
                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
                    </span>
                  </div>
                )}
              </div>

              {/* Users usage mini */}
              <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Usuarios activos</p>
                <p className="text-xl font-bold text-gray-800">
                  {usersCount} <span className="text-sm font-normal text-gray-500">/ {usersLimit === 9999 ? '∞' : usersLimit}</span>
                </p>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        usersPercentage >= 100 ? 'bg-red-500' : usersPercentage >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(usersPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Usage Detail Card ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
              <div className="bg-cyan-100 p-2 rounded-xl">
                <TrendingUpIcon className="w-5 h-5 text-cyan-600" />
              </div>
              Uso del plan
            </h2>
            <div className="space-y-5">
              <UsageBar
                label="Usuarios"
                current={usersCount}
                limit={usersLimit}
              />
              {(usage?.usage || []).map((u, i) => (
                <UsageBar
                  key={i}
                  label={u.metric?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  current={u.current_value}
                  limit={u.limit_value}
                />
              ))}
              {(!usage?.usage || usage.usage.length === 0) && (
                <div className="text-center py-6">
                  <TrendingUpIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay métricas de uso adicionales para tu plan</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Recent Invoices Card ─── */}
          {hasPermission('billing.view_invoices') && (
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <ReceiptIcon className="w-5 h-5 text-amber-600" />
                </div>
                Facturas recientes
              </h2>
              <Link
                to="/dashboard/billing/facturas"
                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Ver todas
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {loadingInvoices ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : invoices.length > 0 ? (
              <div>
                {invoices.map(inv => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ReceiptIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No hay facturas aún</p>
                <p className="text-xs text-gray-400 mt-1">Las facturas se generarán al activar o renovar tu plan</p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="space-y-6">

          {/* ─── Quick Actions ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-xl">
                <ZapIcon className="w-5 h-5 text-blue-600" />
              </div>
              Acciones rápidas
            </h2>
            <div className="space-y-2">
              {hasPermission('billing.manage_payment_methods') && (
              <Link
                to="/dashboard/billing/metodos-pago"
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-blue-50 transition-all duration-200 group border-2 border-transparent hover:border-blue-200"
              >
                <div className="bg-blue-100 p-2.5 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <CreditCardIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Métodos de pago</p>
                  <p className="text-xs text-gray-500">Gestionar tarjetas</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Link>
              )}

              {hasPermission('billing.view_invoices') && (
              <Link
                to="/dashboard/billing/facturas"
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-amber-50 transition-all duration-200 group border-2 border-transparent hover:border-amber-200"
              >
                <div className="bg-amber-100 p-2.5 rounded-xl group-hover:bg-amber-200 transition-colors">
                  <FileTextIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Historial de facturas</p>
                  <p className="text-xs text-gray-500">Ver y descargar facturas</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
              </Link>
              )}

              <Link
                to="/dashboard/billing/planes"
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-purple-50 transition-all duration-200 group border-2 border-transparent hover:border-purple-200"
              >
                <div className="bg-purple-100 p-2.5 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <PackageIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Comparar planes</p>
                  <p className="text-xs text-gray-500">Ver todas las opciones disponibles</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </Link>

              {isOwner && currentPlan !== 'FREE' && hasPermission('billing.checkout') && (
                <Link
                  to="/dashboard/billing/checkout"
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-green-50 transition-all duration-200 group border-2 border-transparent hover:border-green-200"
                >
                  <div className="bg-green-100 p-2.5 rounded-xl group-hover:bg-green-200 transition-colors">
                    <DownloadIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">Renovar plan</p>
                    <p className="text-xs text-gray-500">Extender tu suscripción actual</p>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </Link>
              )}
            </div>
          </div>

          {/* ─── Plan Summary ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className={`bg-gradient-to-r ${accent.from} ${accent.to} p-5 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Tu plan</p>
                  <p className="text-2xl font-bold mt-1">{subscription?.plan_name || 'Gratuito'}</p>
                </div>
                <SparklesIcon className="w-8 h-8 text-white/40" />
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Ciclo</span>
                <span className="font-semibold text-gray-800">
                  {subscription?.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <SubscriptionStatus status={subscription?.status} size="sm" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Usuarios</span>
                <span className="font-semibold text-gray-800">
                  {usersCount} / {usersLimit === 9999 ? '∞' : usersLimit}
                </span>
              </div>
              {subscription?.current_period_end && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Renovación</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(subscription.current_period_end)}
                  </span>
                </div>
              )}

              {isOwner && currentPlan === 'FREE' && hasPermission('billing.checkout') && (
                <Link
                  to="/dashboard/billing/planes"
                  className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-lg mt-2"
                >
                  <ArrowUpCircleIcon className="w-5 h-5" />
                  <span>Mejorar plan</span>
                </Link>
              )}
            </div>
          </div>

          {/* ─── Billing Tips ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Consejos</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Cambia a facturación <strong>anual</strong> y ahorra hasta un 17%.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Revisa tu <strong>uso de recursos</strong> para elegir el plan adecuado.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Descarga tus facturas en PDF para tus registros contables.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>¿Necesitas más? Contacta ventas para un plan <strong>Enterprise</strong>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BillingDashboardPage
