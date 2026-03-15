/**
 * UsageBar — CorteSec
 * 
 * Barra de progreso que muestra el uso actual vs límite del plan.
 */

const UsageBar = ({ label, current, limit, unit = '' }) => {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0
  const isAtLimit = current >= limit
  const isNearLimit = percentage >= 80

  let barColor = 'bg-blue-500'
  if (isAtLimit) barColor = 'bg-red-500'
  else if (isNearLimit) barColor = 'bg-yellow-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-mono text-xs ${isAtLimit ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
          {current}{unit} / {limit === 9999 ? '∞' : `${limit}${unit}`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-600">Has alcanzado el límite de tu plan</p>
      )}
    </div>
  )
}

export default UsageBar
