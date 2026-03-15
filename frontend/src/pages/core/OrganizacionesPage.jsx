import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  Building2 as Building2Icon,
  Search as SearchIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash2 as TrashIcon,
  RefreshCw as RefreshCwIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Filter as FilterIcon,
  X as XIcon,
  CreditCard as CreditCardIcon,
  Users as UsersIcon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
  Check as CheckIcon,
  ArrowRightLeft as ArrowRightLeftIcon,
  Mail as MailIcon,
  MapPin as MapPinIcon,
  LogOut as LogOutIcon,
  ChevronRight as ChevronRightIcon,
  Globe as GlobeIcon,
  Shield as ShieldIcon,
} from 'lucide-react'
import organizationService from '../../services/organizationService'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'

const defaultForm = {
  nombre: '',
  codigo: '',
  slug: '',
  razon_social: '',
  nit: '',
  email: '',
  telefono: '',
  website: '',
  direccion: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  activa: true,
  plan: 'FREE',
  max_users: 5,
  max_storage_mb: 1024,
  is_trial: true,
  trial_ends_at: '',
  primary_color: '#007bff',
}

const PLAN_BADGES = {
  FREE: { label: 'Free', bg: 'bg-gray-100', text: 'text-gray-800' },
  BASIC: { label: 'Basic', bg: 'bg-blue-100', text: 'text-blue-800' },
  PRO: { label: 'Pro', bg: 'bg-purple-100', text: 'text-purple-800' },
  ENTERPRISE: { label: 'Enterprise', bg: 'bg-amber-100', text: 'text-amber-800' },
}

const getTrialDaysLeft = (org) => {
  if (!org.is_trial || !org.trial_ends_at) return null
  const now = new Date()
  const end = new Date(org.trial_ends_at)
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

const OrganizacionesPage = () => {
  const { user } = useAuth()
  const { setTenant, clearTenant } = useTenant()
  const isAdmin = user?.is_staff || user?.is_superuser
  const { hasPermission, initialized } = usePermissions()

  const [organizations, setOrganizations] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingCurrentOrg, setLoadingCurrentOrg] = useState(true)
  const [switchingId, setSwitchingId] = useState(null)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtros, setFiltros] = useState({ activa: '', plan: '' })
  const [showFiltros, setShowFiltros] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const totalPages = Math.ceil(total / pageSize)

  const loadCurrentOrg = async () => {
    setLoadingCurrentOrg(true)
    try {
      const data = await organizationService.getCurrentOrganization()
      setCurrentOrg(data)
    } catch {
      setCurrentOrg(null)
    } finally {
      setLoadingCurrentOrg(false)
    }
  }

  const loadOrganizations = async (targetPage = page) => {
    setLoading(true)
    setError('')
    try {
      const data = await organizationService.list({
        search: searchTerm || undefined,
        activa: filtros.activa || undefined,
        plan: filtros.plan || undefined,
        page: targetPage,
        page_size: pageSize,
      })
      const items = Array.isArray(data) ? data : (data.results || [])
      const count = data.count || items.length
      setOrganizations(items)
      setTotal(count)
      setPage(targetPage)
    } catch (err) {
      setError('No se pudieron cargar las organizaciones.')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentOrg()
  }, [])

  useEffect(() => {
    loadOrganizations(1)
  }, [filtros])

  const stats = useMemo(() => ({
    total: total,
    activas: organizations.filter((o) => o.activa).length,
    enTrial: organizations.filter((o) => o.is_trial).length,
    proPlan: organizations.filter((o) => ['PRO', 'ENTERPRISE'].includes(o.plan)).length,
  }), [organizations, total])

  const handleBuscar = (e) => {
    e.preventDefault()
    loadOrganizations(1)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData(defaultForm)
    setShowForm(true)
  }

  const handleOpenEdit = (org) => {
    setEditingId(org.id)
    setFormData({
      ...defaultForm,
      ...org,
      trial_ends_at: org.trial_ends_at ? org.trial_ends_at.split('T')[0] : '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        trial_ends_at: formData.trial_ends_at || null,
      }

      if (editingId) {
        await organizationService.update(editingId, payload)
        toast.success('Organización actualizada')
      } else {
        await organizationService.create(payload)
        toast.success('Organización creada')
      }
      setShowForm(false)
      setEditingId(null)
      await loadOrganizations()
    } catch (err) {
      toast.error('No se pudo guardar la organización')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (org) => {
    if (!window.confirm(`¿Eliminar "${org.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await organizationService.remove(org.id)
      toast.success('Organización eliminada')
      if (currentOrg?.id === org.id) {
        setCurrentOrg(null)
        clearTenant()
      }
      await loadOrganizations()
    } catch (err) {
      toast.error('No se pudo eliminar la organización')
    }
  }

  const handleSwitch = async (org) => {
    if (currentOrg?.id === org.id) return
    setSwitchingId(org.id)
    try {
      await organizationService.switchOrganization(org.id)
      setTenant(org.codigo, org.slug, { id: org.id, name: org.nombre, codigo: org.codigo, slug: org.slug, plan: org.plan })
      setCurrentOrg(org)
      toast.success(
        <div>
          <strong>Organización cambiada</strong>
          <p className="text-sm mt-1">Ahora estás en <strong>{org.nombre}</strong></p>
        </div>
      )
      // Recargar para que todos los módulos refresquen datos
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error('No se pudo cambiar la organización')
    } finally {
      setSwitchingId(null)
    }
  }

  const handleLeaveOrg = async () => {
    if (!window.confirm('¿Deseas salir de la organización actual? Se cerrará tu sesión de organización.')) return
    try {
      clearTenant()
      setCurrentOrg(null)
      toast.info('Has salido de la organización')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error('No se pudo salir de la organización')
    }
  }

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const isCurrentOrg = (org) => currentOrg?.id === org.id

  if (!initialized) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!hasPermission('organizaciones.view')) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        No tienes permisos para acceder a esta sección
      </div>
    )
  }

  const planBadgeFor = (plan) => PLAN_BADGES[plan] || PLAN_BADGES.FREE

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-700 rounded-3xl shadow-2xl p-8 text-white border border-white/20 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <Building2Icon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Organizaciones</h1>
              <p className="text-indigo-100 mt-1">
                Gestiona el catálogo de organizaciones y planes activos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadOrganizations()}
              className="bg-white/20 backdrop-blur-sm text-white border border-white/30 px-5 py-3 rounded-xl hover:bg-white/30 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
            >
              <RefreshCwIcon className="w-5 h-5" />
              Actualizar
            </button>
            {isAdmin && (
              <Can permission="organizaciones.add">
                <button
                  onClick={handleOpenCreate}
                  className="bg-white text-indigo-700 px-6 py-3 rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold hover:scale-105 transform"
                >
                  <PlusIcon className="w-5 h-5" />
                  Nueva Organización
                </button>
              </Can>
            )}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 pointer-events-none" />
      </div>

      {/* Organización Activa */}
      {!loadingCurrentOrg && currentOrg && (
        <div className="backdrop-blur-xl bg-white/95 rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {currentOrg.nombre?.charAt(0)?.toUpperCase() || 'O'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Organización Activa</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${planBadgeFor(currentOrg.plan).bg} ${planBadgeFor(currentOrg.plan).text}`}>
                    {planBadgeFor(currentOrg.plan).label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mt-0.5">{currentOrg.nombre}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <ShieldIcon className="w-3.5 h-3.5" />
                    Código: <span className="font-mono font-semibold text-gray-700">{currentOrg.codigo}</span>
                  </span>
                  {currentOrg.email && (
                    <span className="flex items-center gap-1">
                      <MailIcon className="w-3.5 h-3.5" />
                      {currentOrg.email}
                    </span>
                  )}
                  {currentOrg.nit && (
                    <span className="flex items-center gap-1">
                      <GlobeIcon className="w-3.5 h-3.5" />
                      NIT: {currentOrg.nit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleLeaveOrg}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all font-semibold group"
            >
              <LogOutIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Salir de organización
            </button>
          </div>
        </div>
      )}

      {!loadingCurrentOrg && !currentOrg && (
        <div className="backdrop-blur-xl bg-amber-50/90 rounded-2xl shadow-lg border-2 border-amber-200 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl">
              <AlertCircleIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800">Sin organización activa</h3>
              <p className="text-sm text-amber-700 mt-0.5">
                Selecciona una organización de la lista para comenzar a trabajar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Organizaciones</p>
              <p className="text-4xl font-bold mt-1">{stats.total}</p>
            </div>
          </div>
          <Building2Icon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-green-100 text-sm font-medium">Activas</p>
              <p className="text-4xl font-bold mt-1">{stats.activas}</p>
            </div>
          </div>
          <CheckCircleIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-amber-100 text-sm font-medium">En Trial</p>
              <p className="text-4xl font-bold mt-1">{stats.enTrial}</p>
            </div>
          </div>
          <ClockIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-purple-100 text-sm font-medium">Plan PRO+</p>
              <p className="text-4xl font-bold mt-1">{stats.proPlan}</p>
            </div>
          </div>
          <CreditCardIcon className="w-16 h-16 text-white/20 absolute -bottom-2 -right-2" />
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 p-6">
        <form onSubmit={handleBuscar} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, código, NIT o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={() => setShowFiltros(!showFiltros)}
              className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-medium border-2 ${
                showFiltros
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
              }`}
            >
              <FilterIcon className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {showFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={filtros.activa}
                  onChange={(e) => setFiltros({ ...filtros, activa: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">Todas</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan
                </label>
                <select
                  value={filtros.plan}
                  onChange={(e) => setFiltros({ ...filtros, plan: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="">Todos los planes</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Lista de organizaciones */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando organizaciones...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => loadOrganizations()}
              className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Reintentar
            </button>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <Building2Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No se encontraron organizaciones</p>
            {isAdmin && (
              <Can permission="organizaciones.add">
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Crear primera organización
                </button>
              </Can>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {organizations.map((org) => {
                const planBadge = planBadgeFor(org.plan)
                const trialDays = getTrialDaysLeft(org)
                const isCurrent = isCurrentOrg(org)
                const isSwitching = switchingId === org.id

                return (
                  <div
                    key={org.id}
                    className={`p-5 transition-all duration-200 ${
                      isCurrent
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500'
                        : 'hover:bg-indigo-50/30 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Info de la organización */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                            isCurrent
                              ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}>
                            {org.nombre?.charAt(0)?.toUpperCase() || 'O'}
                          </div>
                          {isCurrent && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                              <CheckIcon className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-semibold truncate ${isCurrent ? 'text-emerald-900' : 'text-gray-900'}`}>
                              {org.nombre}
                            </h3>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                Activa
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${planBadge.bg} ${planBadge.text}`}>
                              {planBadge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{org.codigo}</span>
                            {org.email && <span className="truncate">{org.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Estado y Trial */}
                      <div className="flex items-center gap-3 mx-4">
                        {org.activa ? (
                          <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-green-100 text-green-800">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Activa
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-red-100 text-red-800">
                            <XCircleIcon className="w-3.5 h-3.5" />
                            Inactiva
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <UsersIcon className="w-4 h-4 text-indigo-400" />
                          <span className="font-medium">{org.max_users}</span>
                        </div>

                        {org.is_trial && (
                          trialDays !== null && trialDays > 0 ? (
                            <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-800">
                              <ClockIcon className="w-3.5 h-3.5" />
                              {trialDays}d trial
                            </span>
                          ) : trialDays === 0 ? (
                            <span className="px-2.5 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-lg bg-red-100 text-red-800">
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Expirado
                            </span>
                          ) : null
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-200">
                            <CheckCircleIcon className="w-4 h-4" />
                            Conectado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitch(org)}
                            disabled={isSwitching || !org.activa}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all text-sm font-semibold border border-indigo-200 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            {isSwitching ? (
                              <>
                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                Cambiando...
                              </>
                            ) : (
                              <>
                                <ArrowRightLeftIcon className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                                Usar esta
                              </>
                            )}
                          </button>
                        )}

                        {isAdmin && (
                          <>
                            <Can permission="organizaciones.change">
                              <button
                                onClick={() => handleOpenEdit(org)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                title="Editar"
                              >
                                <EditIcon className="w-4 h-4" />
                              </button>
                            </Can>
                            <Can permission="organizaciones.delete">
                              <button
                                onClick={() => handleDelete(org)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                                title="Eliminar"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </Can>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginacion */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Mostrando{' '}
                    <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}</span>{' '}
                    a{' '}
                    <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span>{' '}
                    de <span className="font-semibold text-gray-900">{total}</span> resultados
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadOrganizations(page - 1)}
                      disabled={page <= 1}
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Anterior
                    </button>

                    {[...Array(totalPages)].map((_, index) => {
                      const p = index + 1
                      if (
                        p === 1 ||
                        p === totalPages ||
                        (p >= page - 1 && p <= page + 1)
                      ) {
                        return (
                          <button
                            key={p}
                            onClick={() => loadOrganizations(p)}
                            className={`px-4 py-2 border-2 rounded-xl text-sm font-medium transition-all ${
                              p === page
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-md'
                                : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      } else if (p === page - 2 || p === page + 2) {
                        return <span key={p} className="px-2 py-2 text-gray-400">...</span>
                      }
                      return null
                    })}

                    <button
                      onClick={() => loadOrganizations(page + 1)}
                      disabled={page >= totalPages}
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Crear/Editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
                  <Building2Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {editingId ? 'Editar Organización' : 'Nueva Organización'}
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    {editingId
                      ? 'Actualiza los datos de la organización'
                      : 'Completa la información para crear una nueva organización'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
                {/* Información General */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Building2Icon className="w-4 h-4 text-indigo-600" />
                    Información General
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => handleFieldChange('nombre', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                      <input
                        type="text"
                        required
                        value={formData.codigo}
                        onChange={(e) => handleFieldChange('codigo', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => handleFieldChange('slug', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                      <input
                        type="text"
                        value={formData.razon_social}
                        onChange={(e) => handleFieldChange('razon_social', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                      <input
                        type="text"
                        value={formData.nit}
                        onChange={(e) => handleFieldChange('nit', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* Contacto */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MailIcon className="w-4 h-4 text-indigo-600" />
                    Contacto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={formData.telefono}
                        onChange={(e) => handleFieldChange('telefono', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => handleFieldChange('website', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* Ubicacion */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-indigo-600" />
                    Ubicación
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={formData.direccion}
                        onChange={(e) => handleFieldChange('direccion', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado/Provincia</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => handleFieldChange('country', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => handleFieldChange('postal_code', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* Plan y Limites */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-indigo-600" />
                    Plan y Límites
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                      <select
                        value={formData.plan}
                        onChange={(e) => handleFieldChange('plan', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      >
                        <option value="FREE">Free</option>
                        <option value="BASIC">Basic</option>
                        <option value="PRO">Profesional</option>
                        <option value="ENTERPRISE">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuarios</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_users}
                        onChange={(e) => handleFieldChange('max_users', Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Almacenamiento (MB)</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_storage_mb}
                        onChange={(e) => handleFieldChange('max_storage_mb', Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trial hasta</label>
                      <input
                        type="date"
                        value={formData.trial_ends_at}
                        onChange={(e) => handleFieldChange('trial_ends_at', e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Color Primario</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                          className="h-11 w-14 border-2 border-gray-200 rounded-xl cursor-pointer"
                        />
                        <span className="text-sm text-gray-500 font-mono">{formData.primary_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200" />

                {/* Estado */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-indigo-600" />
                    Estado
                  </h4>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.activa}
                        onChange={(e) => handleFieldChange('activa', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 border-2 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">Organización activa</span>
                        <p className="text-xs text-gray-500">Permite el acceso a los usuarios</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.is_trial}
                        onChange={(e) => handleFieldChange('is_trial', e.target.checked)}
                        className="w-5 h-5 text-amber-600 rounded-lg focus:ring-amber-500 border-2 border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition-colors">Trial activo</span>
                        <p className="text-xs text-gray-500">Período de prueba habilitado</p>
                      </div>
                    </label>
                  </div>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-semibold flex items-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      {editingId ? 'Actualizar' : 'Crear Organización'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  )
}

export default OrganizacionesPage
