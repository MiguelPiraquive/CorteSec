/**
 * PlanComparisonTable — CorteSec
 * 
 * Tabla comparativa de features entre planes.
 */
import { CheckIcon, XIcon, MinusIcon } from 'lucide-react'

const PlanComparisonTable = ({ plans = [], currentPlan = '' }) => {
  if (plans.length === 0) return null

  // Recopilar todos los feature codes únicos
  const allFeatures = new Map()
  plans.forEach(plan => {
    (plan.features || []).forEach(f => {
      if (!allFeatures.has(f.code)) {
        allFeatures.set(f.code, f.name)
      }
    })
  })

  const featureList = Array.from(allFeatures.entries())

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-50 border-b">
              Funcionalidad
            </th>
            {plans.map(plan => (
              <th
                key={plan.code}
                className={`text-center px-4 py-3 text-sm font-semibold border-b bg-gray-50
                  ${currentPlan === plan.code ? 'text-blue-700 bg-blue-50' : 'text-gray-700'}`}
              >
                <div>{plan.name}</div>
                {currentPlan === plan.code && (
                  <span className="text-[10px] text-blue-500 font-normal">Tu plan</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Limits row */}
          <tr className="border-b bg-gray-25">
            <td className="px-4 py-2.5 text-sm font-medium text-gray-700">Usuarios máximos</td>
            {plans.map(plan => (
              <td key={plan.code} className="text-center px-4 py-2.5 text-sm text-gray-900 font-medium">
                {plan.max_users === 9999 ? 'Ilimitados' : plan.max_users}
              </td>
            ))}
          </tr>
          <tr className="border-b">
            <td className="px-4 py-2.5 text-sm font-medium text-gray-700">Almacenamiento</td>
            {plans.map(plan => (
              <td key={plan.code} className="text-center px-4 py-2.5 text-sm text-gray-900 font-medium">
                {plan.max_storage_mb >= 1024 
                  ? `${(plan.max_storage_mb / 1024).toFixed(0)} GB` 
                  : `${plan.max_storage_mb} MB`}
              </td>
            ))}
          </tr>

          {/* Features */}
          {featureList.map(([code, name], index) => (
            <tr key={code} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="px-4 py-2.5 text-sm text-gray-700">{name}</td>
              {plans.map(plan => {
                const feature = (plan.features || []).find(f => f.code === code)
                const hasFeature = feature !== undefined
                const limit = feature?.limit_value

                return (
                  <td key={plan.code} className="text-center px-4 py-2.5">
                    {hasFeature ? (
                      limit !== null && limit !== undefined ? (
                        <span className="text-sm font-medium text-gray-900">{limit}</span>
                      ) : (
                        <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
                      )
                    ) : (
                      <XIcon className="w-5 h-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default PlanComparisonTable
