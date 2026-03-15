/**
 * InvoiceRow — CorteSec
 * 
 * Fila de factura con descarga PDF y estado.
 */
import { DownloadIcon, FileTextIcon } from 'lucide-react'
import billingService from '../../services/billingService'
import { useState } from 'react'

const STATUS_STYLES = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Borrador' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagada' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Fallida' },
  canceled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelada' },
  refunded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Reembolsada' },
}

const formatCOP = (value) => {
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
    month: 'short',
    day: 'numeric',
  })
}

const InvoiceRow = ({ invoice }) => {
  const [downloading, setDownloading] = useState(false)
  const style = STATUS_STYLES[invoice.status] || STATUS_STYLES.pending

  const handleDownload = async () => {
    try {
      setDownloading(true)
      await billingService.downloadInvoicePDF(invoice.id)
    } catch (err) {
      console.error('Error downloading PDF:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <FileTextIcon className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
          <p className="text-xs text-gray-500">{formatDate(invoice.created_at)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        <span className="text-sm font-semibold text-gray-900 min-w-[100px] text-right">
          {formatCOP(invoice.total)}
        </span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
          title="Descargar PDF"
        >
          <DownloadIcon className={`w-4 h-4 ${downloading ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  )
}

export default InvoiceRow
