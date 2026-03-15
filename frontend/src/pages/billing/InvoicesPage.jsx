/**
 * InvoicesPage — CorteSec
 *
 * Historial de facturas con descarga PDF.
 * Estilo glassmorphism consistente con el resto del dashboard.
 */
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ReceiptIcon,
  InboxIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  FileTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowLeftIcon,
  CalendarIcon,
} from 'lucide-react'
import billingService from '../../services/billingService'
import { usePermissions } from '../../context/PermissionsContext'
import InvoiceRow from '../../components/billing/InvoiceRow'

/* ─── Helpers ─── */
const formatCOP = (value) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todas', icon: ReceiptIcon, color: 'indigo' },
  { key: 'paid', label: 'Pagadas', icon: CheckCircleIcon, color: 'green' },
  { key: 'pending', label: 'Pendientes', icon: ClockIcon, color: 'yellow' },
  { key: 'failed', label: 'Fallidas', icon: XCircleIcon, color: 'red' },
]

/* ─── Component ─── */
const InvoicesPage = () => {
  const { hasPermission, initialized } = usePermissions()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await billingService.getInvoices()
        setInvoices(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error loading invoices:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = invoices
    if (filter !== 'all') {
      result = result.filter(inv => inv.status === filter)
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(inv =>
        inv.number?.toLowerCase().includes(term) ||
        inv.total?.toString().includes(term)
      )
    }
    return result
  }, [invoices, filter, searchTerm])

  // Stats
  const totalPaid = useMemo(() =>
    invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
    [invoices]
  )
  const totalPending = useMemo(() =>
    invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + (i.total || 0), 0),
    [invoices]
  )

  /* ─── Loading ─── */
  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!hasPermission('billing.view_invoices')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Cargando facturas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <ReceiptIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Facturas</h1>
              <p className="text-orange-100 mt-1 text-lg">Historial completo de todas tus facturas</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-orange-200 text-sm">Total facturas</div>
                <div className="text-2xl font-bold mt-0.5">{invoices.length}</div>
              </div>
              <FileTextIcon className="w-8 h-8 text-orange-200" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-orange-200 text-sm">Pagadas</div>
                <div className="text-2xl font-bold mt-0.5">{invoices.filter(i => i.status === 'paid').length}</div>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-orange-200 text-sm">Total pagado</div>
                <div className="text-xl font-bold mt-0.5">{formatCOP(totalPaid)}</div>
              </div>
              <DownloadIcon className="w-8 h-8 text-cyan-300" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-orange-200 text-sm">Por cobrar</div>
                <div className="text-xl font-bold mt-0.5">{formatCOP(totalPending)}</div>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters Bar ─── */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(f => {
              const Icon = f.icon
              const isActive = filter === f.key
              const count = f.key === 'all' ? invoices.length : invoices.filter(i => i.status === f.key).length
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? `bg-${f.color}-100 text-${f.color}-700 border-2 border-${f.color}-300 shadow-sm`
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {f.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? `bg-${f.color}-200 text-${f.color}-800` : 'bg-gray-200 text-gray-500'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── Invoice List ─── */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <InboxIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No se encontraron facturas</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter !== 'all' || searchTerm
                ? 'Intenta cambiar los filtros o el término de búsqueda'
                : 'Las facturas se generarán al activar o renovar tu plan'}
            </p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="hidden md:flex items-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold uppercase tracking-wider">
              <div className="flex-1">Factura</div>
              <div className="w-28 text-center">Estado</div>
              <div className="w-32 text-right">Monto</div>
              <div className="w-16 text-center">PDF</div>
            </div>

            {filtered.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoicesPage
