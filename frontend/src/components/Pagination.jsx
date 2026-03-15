import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'

/**
 * Componente de paginación reutilizable para paginación del servidor.
 *
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 * @param {number} totalCount - Total de registros
 * @param {number} pageSize - Registros por página
 * @param {Function} onPageChange - Callback cuando cambia la página
 * @param {string} itemLabel - Etiqueta para los items (ej: "cargos", "empleados")
 */
export default function Pagination({ currentPage, totalPages, totalCount, pageSize, onPageChange, itemLabel = 'registros' }) {
  if (totalPages <= 1) return null

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalCount)

  // Calculate visible page numbers (show max 5)
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i)
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i)
    }

    return pages
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-t border-gray-200">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-semibold text-gray-900">{startIndex}</span> a{' '}
          <span className="font-semibold text-gray-900">{endIndex}</span> de{' '}
          <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span> {itemLabel}
          <span className="ml-2 text-gray-400">
            (Página {currentPage} de {totalPages})
          </span>
        </div>
        <div className="flex space-x-1.5">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Primera página"
          >
            <ChevronsLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Página anterior"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>

          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPage === pageNum
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Página siguiente"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Última página"
          >
            <ChevronsRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
