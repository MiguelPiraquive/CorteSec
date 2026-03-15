/**
 * SubscriptionStatus — CorteSec
 * 
 * Badge que muestra el estado de la suscripción.
 */
const STATUS_STYLES = {
  trialing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Prueba gratuita' },
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Activa' },
  past_due: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pago pendiente' },
  suspended: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Suspendida' },
  canceled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelada' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Expirada' },
}

const SubscriptionStatus = ({ status, size = 'sm' }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.expired
  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1.5 text-sm' 
    : 'px-2 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'active' ? 'bg-green-500' : status === 'trialing' ? 'bg-blue-500' : 'bg-current'}`} />
      {style.label}
    </span>
  )
}

export default SubscriptionStatus
