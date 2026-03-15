/**
 * PaymentMethodsPage — CorteSec
 *
 * Gestión de métodos de pago (tarjetas).
 * Estilo glassmorphism consistente con el resto del dashboard.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  LockIcon,
  StarIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from 'lucide-react'
import billingService from '../../services/billingService'
import { usePermissions } from '../../context/PermissionsContext'
import PaymentMethodCard from '../../components/billing/PaymentMethodCard'
import { toast } from 'react-toastify'

/* ─── Component ─── */
const PaymentMethodsPage = () => {
  const { hasPermission, initialized } = usePermissions()
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const loadMethods = async () => {
    try {
      const data = await billingService.getPaymentMethods()
      setMethods(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading payment methods:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este método de pago?')) return

    try {
      setDeletingId(id)
      await billingService.deletePaymentMethod(id)
      setMethods(prev => prev.filter(m => m.id !== id))
      toast.success('Método de pago eliminado.')
    } catch (err) {
      toast.error('Error al eliminar método de pago.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await billingService.setDefaultPaymentMethod(id)
      await loadMethods()
      toast.success('Método de pago predeterminado actualizado.')
    } catch (err) {
      toast.error('Error al actualizar método de pago.')
    }
  }

  const defaultMethod = methods.find(m => m.is_default)
  const otherMethods = methods.filter(m => !m.is_default)

  /* ─── Loading ─── */
  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('billing.manage_payment_methods')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Cargando métodos de pago...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <CreditCardIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Métodos de pago</h1>
              <p className="text-blue-100 mt-1 text-lg">Gestiona tus tarjetas para pagos automáticos</p>
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
                <div className="text-blue-200 text-sm">Tarjetas guardadas</div>
                <div className="text-2xl font-bold mt-0.5">{methods.length}</div>
              </div>
              <CreditCardIcon className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">Predeterminada</div>
                <div className="text-lg font-bold mt-0.5">
                  {defaultMethod ? `•••• ${defaultMethod.last4}` : 'Ninguna'}
                </div>
              </div>
              <StarIcon className="w-8 h-8 text-yellow-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-200 text-sm">Seguridad</div>
                <div className="text-lg font-bold mt-0.5">PCI-DSS</div>
              </div>
              <ShieldCheckIcon className="w-8 h-8 text-green-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Left: Card List (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Default card */}
          {defaultMethod && (
            <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
                <div className="bg-yellow-100 p-2 rounded-xl">
                  <StarIcon className="w-5 h-5 text-yellow-600" />
                </div>
                Tarjeta predeterminada
              </h2>
              <PaymentMethodCard
                method={defaultMethod}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
                isDeleting={deletingId === defaultMethod.id}
              />
            </div>
          )}

          {/* Other cards */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-xl">
                <CreditCardIcon className="w-5 h-5 text-blue-600" />
              </div>
              {defaultMethod ? 'Otras tarjetas' : 'Tus tarjetas'}
            </h2>

            {(defaultMethod ? otherMethods : methods).length === 0 ? (
              <div className="text-center py-12">
                <CreditCardIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">
                  {methods.length === 0
                    ? 'No tienes métodos de pago guardados'
                    : 'No tienes tarjetas adicionales'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Se agregarán automáticamente al realizar un checkout
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(defaultMethod ? otherMethods : methods).map(method => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                    isDeleting={deletingId === method.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="space-y-6">

          {/* Security info */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Seguridad</p>
                  <p className="text-xl font-bold mt-1">Pago protegido</p>
                </div>
                <LockIcon className="w-8 h-8 text-white/40" />
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Encriptación SSL 256-bit</p>
                  <p className="text-xs text-gray-500">Todos los datos viajan encriptados</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Sin datos de tarjeta</p>
                  <p className="text-xs text-gray-500">Nunca almacenamos números completos</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Procesado por Stripe</p>
                  <p className="text-xs text-gray-500">Certificación PCI-DSS Level 1</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Tokenización</p>
                  <p className="text-xs text-gray-500">Solo guardamos un token seguro</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Consejos</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Mantén una tarjeta <strong>predeterminada</strong> para evitar interrupciones.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Si tu tarjeta <strong>expira</strong>, actualízala antes del próximo cobro.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Puedes tener <strong>varias tarjetas</strong> y elegir cuál usar en cada pago.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>Las tarjetas se agregan automáticamente al hacer <strong>checkout</strong>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodsPage
