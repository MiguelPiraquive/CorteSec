/**
 * PricingCard — CorteSec
 * 
 * Card individual de plan con precio, features y CTA.
 */
import { CheckIcon, StarIcon } from 'lucide-react'

const PLAN_STYLES = {
  FREE: {
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    button: 'bg-gray-600 hover:bg-gray-700 text-white',
  },
  BASIC: {
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
    button: 'bg-green-600 hover:bg-green-700 text-white',
  },
  PRO: {
    border: 'border-blue-300 ring-2 ring-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  ENTERPRISE: {
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
}

const formatCOP = (value) => {
  if (value === null || value === undefined) return 'Cotización'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const PricingCard = ({
  plan,
  billingCycle = 'monthly',
  currentPlan = '',
  isPopular = false,
  onSelect,
  disabled = false,
}) => {
  const style = PLAN_STYLES[plan.code] || PLAN_STYLES.BASIC
  const isCurrent = currentPlan === plan.code
  const price = billingCycle === 'yearly' ? plan.price_yearly_cop : plan.price_monthly_cop
  const isContactUs = price === null

  return (
    <div className={`relative bg-white rounded-xl border-2 ${style.border} p-6 flex flex-col transition-all hover:shadow-lg ${isPopular ? 'scale-[1.02]' : ''}`}>
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full shadow-sm">
            <StarIcon className="w-3 h-3" />
            Más popular
          </span>
        </div>
      )}

      {/* Plan name */}
      <div className="mb-4">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}>
          {plan.code}
        </span>
        <h3 className="text-xl font-bold text-gray-900 mt-2">{plan.name}</h3>
        {plan.description && (
          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mb-6">
        {isContactUs ? (
          <div>
            <span className="text-2xl font-bold text-gray-900">Personalizado</span>
            <p className="text-sm text-gray-500 mt-1">Contacta a ventas</p>
          </div>
        ) : (
          <div>
            <span className="text-3xl font-bold text-gray-900">{formatCOP(price)}</span>
            <span className="text-sm text-gray-500 ml-1">
              /{billingCycle === 'yearly' ? 'año' : 'mes'}
            </span>
            {billingCycle === 'yearly' && plan.price_monthly_cop && (
              <p className="text-xs text-green-600 font-medium mt-1">
                Ahorras {formatCOP(plan.price_monthly_cop * 12 - price)}/año
              </p>
            )}
          </div>
        )}
      </div>

      {/* Limits */}
      <div className="mb-4 pb-4 border-b border-gray-100 space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium">Hasta {plan.max_users === 9999 ? '∞' : plan.max_users} usuarios</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <span className="font-medium">
            {plan.max_storage_mb >= 1024 
              ? `${(plan.max_storage_mb / 1024).toFixed(0)} GB almacenamiento` 
              : `${plan.max_storage_mb} MB almacenamiento`}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 mb-6">
        <ul className="space-y-2">
          {(plan.features || []).slice(0, 8).map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{feature.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect?.(plan)}
        disabled={disabled || isCurrent}
        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all
          ${isCurrent
            ? 'bg-gray-100 text-gray-500 cursor-default'
            : `${style.button} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
          }`}
      >
        {isCurrent ? 'Plan actual' : isContactUs ? 'Contactar ventas' : 'Elegir plan'}
      </button>
    </div>
  )
}

export default PricingCard
