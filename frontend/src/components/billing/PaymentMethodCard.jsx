/**
 * PaymentMethodCard — CorteSec
 * 
 * Tarjeta de método de pago guardado con acciones.
 */
import { CreditCardIcon, TrashIcon, StarIcon } from 'lucide-react'

const BRAND_ICONS = {
  visa: '💳 Visa',
  mastercard: '💳 Mastercard',
  amex: '💳 Amex',
  discover: '💳 Discover',
  other: '💳',
}

const PaymentMethodCard = ({ method, onDelete, onSetDefault, isDeleting = false }) => {
  const brandDisplay = BRAND_ICONS[method.card_brand?.toLowerCase()] || BRAND_ICONS.other
  const isExpired = method.is_expired_card

  return (
    <div className={`border rounded-lg p-4 flex items-center justify-between transition-colors
      ${method.is_default ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}
      ${isExpired ? 'opacity-70' : ''}`}
    >
      <div className="flex items-center gap-3">
        <CreditCardIcon className={`w-8 h-8 ${method.is_default ? 'text-blue-500' : 'text-gray-400'}`} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {brandDisplay} •••• {method.card_last4}
            </span>
            {method.is_default && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                <StarIcon className="w-2.5 h-2.5" />
                Predeterminada
              </span>
            )}
            {isExpired && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                Expirada
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Expira {method.card_exp_month?.toString().padStart(2, '0')}/{method.card_exp_year}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!method.is_default && (
          <button
            onClick={() => onSetDefault?.(method.id)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Hacer predeterminada
          </button>
        )}
        <button
          onClick={() => onDelete?.(method.id)}
          disabled={isDeleting || method.is_default}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={method.is_default ? 'No puedes eliminar la tarjeta predeterminada' : 'Eliminar'}
        >
          <TrashIcon className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  )
}

export default PaymentMethodCard
