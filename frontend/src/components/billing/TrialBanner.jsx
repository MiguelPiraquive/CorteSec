/**
 * TrialBanner — CorteSec
 * 
 * Banner que se muestra en el dashboard cuando el usuario está en periodo de prueba.
 * Cambia de color según la urgencia (>7d verde, 3-7d amarillo, <3d rojo).
 */
import { Link } from 'react-router-dom'
import { ClockIcon, ArrowRightIcon, AlertTriangleIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useBilling } from '../../context/BillingContext'

const DISMISSED_KEY = 'trial_banner_dismissed'

const TrialBanner = () => {
  const { subscription, isTrialing, daysRemaining, isExpired, isOwner } = useBilling()
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(DISMISSED_KEY) === 'true'
  })

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(DISMISSED_KEY, 'true')
  }

  if (dismissed) return null
  if (!isTrialing && !isExpired) return null

  // Determinar urgencia
  let urgency = 'info'
  let bgColor = 'bg-blue-50 border-blue-200'
  let textColor = 'text-blue-800'
  let iconColor = 'text-blue-500'
  let Icon = ClockIcon

  if (isExpired) {
    urgency = 'critical'
    bgColor = 'bg-red-50 border-red-300'
    textColor = 'text-red-800'
    iconColor = 'text-red-500'
    Icon = AlertTriangleIcon
  } else if (daysRemaining !== null) {
    if (daysRemaining <= 1) {
      urgency = 'critical'
      bgColor = 'bg-red-50 border-red-300 animate-pulse'
      textColor = 'text-red-800'
      iconColor = 'text-red-500'
      Icon = AlertTriangleIcon
    } else if (daysRemaining <= 3) {
      urgency = 'warning'
      bgColor = 'bg-orange-50 border-orange-300'
      textColor = 'text-orange-800'
      iconColor = 'text-orange-500'
      Icon = AlertTriangleIcon
    } else if (daysRemaining <= 7) {
      urgency = 'attention'
      bgColor = 'bg-yellow-50 border-yellow-300'
      textColor = 'text-yellow-800'
      iconColor = 'text-yellow-500'
      Icon = ClockIcon
    }
  }

  // Mensaje
  let message = ''
  if (isExpired) {
    message = 'Tu periodo de prueba ha terminado. Tu cuenta está en modo lectura.'
  } else if (daysRemaining === null || daysRemaining === undefined) {
    message = 'Estás en periodo de prueba gratuita.'
  } else if (daysRemaining === 0) {
    message = 'Tu periodo de prueba termina hoy.'
  } else if (daysRemaining === 1) {
    message = 'Tu periodo de prueba termina mañana.'
  } else {
    message = `Te quedan ${daysRemaining} días de prueba gratuita.`
  }

  return (
    <div className={`relative border rounded-lg px-4 py-3 mb-4 flex items-center justify-between ${bgColor}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <p className={`text-sm font-medium ${textColor}`}>
          {message}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isOwner && (
          <Link
            to="/dashboard/billing/checkout"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all
              ${urgency === 'critical' 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : urgency === 'warning'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            Activar plan
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        )}
        {!isExpired && (
          <button
            onClick={handleDismiss}
            className={`p-1 rounded hover:bg-black/5 ${textColor} opacity-60 hover:opacity-100`}
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

export default TrialBanner
