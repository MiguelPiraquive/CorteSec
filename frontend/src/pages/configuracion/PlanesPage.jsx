import { useEffect, useMemo, useState } from 'react'
import {
  PlusIcon,
  SearchIcon,
  EditIcon,
  Trash2Icon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  CreditCardIcon,
  ArrowRightIcon,
  StarIcon,
  BuildingIcon,
  UsersIcon,
  HardDriveIcon,
  DownloadIcon,
  XIcon,
  SaveIcon,
} from 'lucide-react'
import useAudit from '../../hooks/useAudit'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../context/PermissionsContext'
import { useConfiguracion } from '../../context/ConfiguracionContext'
import plansService from '../../services/plansService'
import organizationService from '../../services/organizationService'

const defaultForm = {
  code: '',
  name: '',
  description: '',
  price_monthly_cop: '',
  price_yearly_cop: '',
  max_users: 5,
  max_storage_mb: 1024,
  features: '',
  is_public: true,
  is_active: true,
  sort_order: 0,
}

const PLAN_COLORS = {
  ENTERPRISE: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  PRO: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  BASIC: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  FREE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
}

const PlanesPage = () => {
  const audit = useAudit('Gestión de Planes')
  const { user } = useAuth()
  const { formatCurrency, formatDateTime } = useConfiguracion()
  const { hasPermission, initialized } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState([])
  const [planHistory, setPlanHistory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [formData, setFormData] = useState(defaultForm)

  const [organization, setOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [selectedPlanCode, setSelectedPlanCode] = useState('')
  const [applyingPlan, setApplyingPlan] = useState(false)
  const [orgSearchTerm, setOrgSearchTerm] = useState('')

  const filteredPlans = useMemo(() => {
    const normalized = searchTerm.toLowerCase().trim()
    if (!normalized) return plans
    return plans.filter(plan =>
      plan.name.toLowerCase().includes(normalized) ||
      plan.code.toLowerCase().includes(normalized)
    )
  }, [plans, searchTerm])

  const filteredOrgs = useMemo(() => {
    if (!orgSearchTerm.trim()) return organizations
    const term = orgSearchTerm.toLowerCase()
    return organizations.filter(o =>
      o.nombre?.toLowerCase().includes(term) ||
      o.codigo?.toLowerCase().includes(term) ||
      o.plan?.toLowerCase().includes(term)
    )
  }, [organizations, orgSearchTerm])

  useEffect(() => {
    if (user?.is_staff || user?.is_superuser) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [plansData, orgsData] = await Promise.all([
        plansService.getPlans(),
        organizationService.list().catch(() => []),
      ])
      setPlans(Array.isArray(plansData) ? plansData : [])
      const orgsList = Array.isArray(orgsData?.results) ? orgsData.results : Array.isArray(orgsData) ? orgsData : []
      setOrganizations(orgsList)
      if (orgsList.length > 0) {
        const firstOrg = orgsList[0]
        setOrganization(firstOrg)
        setSelectedOrgId(firstOrg.id)
        setSelectedPlanCode(firstOrg.plan || '')
        const history = await plansService.getPlanChanges(firstOrg.id)
        setPlanHistory(Array.isArray(history) ? history : [])
      }
    } catch (error) {
      showNotification('error', 'No se pudieron cargar los planes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrgChange = async (orgId) => {
    setSelectedOrgId(orgId)
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setOrganization(org)
      setSelectedPlanCode(org.plan || '')
      try {
        const history = await plansService.getPlanChanges(org.id)
        setPlanHistory(Array.isArray(history) ? history : [])
      } catch {
        setPlanHistory([])
      }
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData({ ...defaultForm, sort_order: plans.length })
    setShowModal(true)
    audit.button('abrir_crear_plan')
  }

  const openEditModal = (plan) => {
    setEditingPlan(plan)
    setFormData({
      code: plan.code || '',
      name: plan.name || '',
      description: plan.description || '',
      price_monthly_cop: plan.price_monthly_cop ?? '',
      price_yearly_cop: plan.price_yearly_cop ?? '',
      max_users: plan.max_users ?? 5,
      max_storage_mb: plan.max_storage_mb ?? 1024,
      features: (plan.features || []).join('\n'),
      is_public: !!plan.is_public,
      is_active: !!plan.is_active,
      sort_order: plan.sort_order ?? 0,
    })
    setShowModal(true)
    audit.button('abrir_editar_plan', { plan_id: plan.id })
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(`¿Eliminar el plan "${plan.name}"?`)) return
    try {
      await plansService.deletePlan(plan.id)
      showNotification('success', 'Plan eliminado exitosamente')
      setPlans(prev => prev.filter(item => item.id !== plan.id))
      audit.button('eliminar_plan', { plan_id: plan.id })
    } catch (error) {
      showNotification('error', 'No se pudo eliminar el plan')
      console.error(error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      showNotification('error', 'Código y nombre son obligatorios')
      return
    }

    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      price_monthly_cop: formData.price_monthly_cop === '' ? null : Number(formData.price_monthly_cop),
      price_yearly_cop: formData.price_yearly_cop === '' ? null : Number(formData.price_yearly_cop),
      max_users: Number(formData.max_users) || 1,
      max_storage_mb: Number(formData.max_storage_mb) || 100,
      features: formData.features
        ? formData.features.split('\n').map(item => item.trim()).filter(Boolean)
        : [],
    }

    try {
      setSaving(true)
      if (editingPlan) {
        const updated = await plansService.updatePlan(editingPlan.id, payload)
        setPlans(prev => prev.map(item => item.id === editingPlan.id ? updated : item))
        showNotification('success', 'Plan actualizado exitosamente')
        audit.button('actualizar_plan', { plan_id: editingPlan.id })
      } else {
        const created = await plansService.createPlan(payload)
        setPlans(prev => [...prev, created])
        showNotification('success', 'Plan creado exitosamente')
        audit.button('crear_plan', { plan_code: payload.code })
      }
      setShowModal(false)
    } catch (error) {
      showNotification('error', 'No se pudo guardar el plan')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleApplyPlan = async () => {
    if (!organization) {
      showNotification('error', 'Selecciona una organización')
      return
    }
    if (!selectedPlanCode) {
      showNotification('error', 'Selecciona un plan')
      return
    }

    try {
      setApplyingPlan(true)
      const updated = await organizationService.setPlan(organization.id, { plan: selectedPlanCode })
      setOrganization(updated)
      setOrganizations(prev => prev.map(o => o.id === updated.id ? updated : o))
      const history = await plansService.getPlanChanges(organization.id)
      setPlanHistory(Array.isArray(history) ? history : [])
      showNotification('success', `Plan ${selectedPlanCode} asignado a ${organization.nombre}`)
      audit.button('asignar_plan', { plan: selectedPlanCode, org: organization.nombre })
    } catch (error) {
      showNotification('error', 'No se pudo asignar el plan')
      console.error(error)
    } finally {
      setApplyingPlan(false)
    }
  }

  const exportHistoryCsv = () => {
    if (!planHistory.length) {
      showNotification('error', 'No hay historial para exportar')
      return
    }
    const headers = ['Fecha', 'Organizacion', 'Usuario', 'Plan anterior', 'Plan nuevo', 'Usuarios', 'Storage (MB)']
    const rows = planHistory.map(item => [
      formatDateTime(item.created_at),
      item.organization_name || '',
      item.changed_by_username || 'Sistema',
      item.previous_plan || '',
      item.new_plan || '',
      item.new_limits?.max_users ?? '',
      item.new_limits?.max_storage_mb ?? '',
    ])
    const csvContent = [headers, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `plan-changes-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const getPlanColor = (code) => PLAN_COLORS[code] || PLAN_COLORS.FREE

  // ─── Loading ───
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-3">
          <Loader2Icon className="w-8 h-8 text-purple-500 animate-spin" />
          <span className="text-gray-600">Cargando planes...</span>
        </div>
      </div>
    )
  }

  // ─── No access ───
  if (!hasPermission('configuracion.manage_parametros') && !user?.is_staff && !user?.is_superuser) {
    return (
      <div className="space-y-6">
        <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="w-6 h-6 text-yellow-500 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">Acceso restringido</h2>
              <p className="text-sm text-gray-600 mt-1">
                Esta sección es solo para administradores. Solicita acceso a tu equipo de TI.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Notification Toast ─── */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${
          notification.type === 'success'
            ? 'bg-green-500/90 border-green-400 text-white'
            : notification.type === 'error'
            ? 'bg-red-500/90 border-red-400 text-white'
            : 'bg-yellow-500/90 border-yellow-400 text-white'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* ─── Page Header ─── */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <CreditCardIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Planes y Suscripciones</h1>
              <p className="text-purple-100 mt-1">Administra planes SaaS y asigna planes a cualquier organización del sistema</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-6 py-3 rounded-xl font-bold bg-white/20 text-white border-2 border-white/30">
              {plans.length} {plans.length === 1 ? 'Plan' : 'Planes'}
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all font-semibold border-2 border-white/30"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Nuevo plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ─── Left: Plan Catalog (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Catálogo de planes</h2>
              <div className="relative">
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                />
              </div>
            </div>

            {filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <CreditCardIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay planes registrados.</p>
                <p className="text-xs text-gray-400 mt-1">Crea tu primer plan con el botón &quot;Nuevo plan&quot;</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPlans.map(plan => {
                  const color = getPlanColor(plan.code)
                  return (
                    <div key={plan.id} className="border-2 border-gray-200/80 rounded-2xl p-5 bg-white/80 hover:shadow-md transition-all">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-xl ${color.bg} ${color.text} flex items-center justify-center flex-shrink-0`}>
                              <CreditCardIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-800 truncate">{plan.name}</h3>
                                {plan.code === 'PRO' && (
                                  <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                    <StarIcon className="w-3.5 h-3.5" /> Popular
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">Código: <span className="font-mono font-semibold">{plan.code}</span></p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{plan.description || 'Sin descripción'}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                              <UsersIcon className="w-3 h-3 inline mr-1" />{plan.max_users} usuarios
                            </span>
                            <span className="px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                              <HardDriveIcon className="w-3 h-3 inline mr-1" />{plan.max_storage_mb} MB
                            </span>
                            <span className={`px-3 py-1 rounded-full border ${plan.is_public ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                              {plan.is_public ? '✓ Visible' : '✗ No visible'}
                            </span>
                            <span className={`px-3 py-1 rounded-full border ${plan.is_active ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {plan.is_active ? '✓ Activo' : '✗ Inactivo'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(plan)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-200"
                            title="Editar"
                          >
                            <EditIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                            title="Eliminar"
                          >
                            <Trash2Icon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 pt-4 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Precio mensual</label>
                          <p className="text-base font-bold text-gray-800">
                            {plan.price_monthly_cop === null || plan.price_monthly_cop === undefined ? (
                              <span className="text-purple-600">Cotización</span>
                            ) : formatCurrency(plan.price_monthly_cop)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Precio anual</label>
                          <p className="text-base font-bold text-gray-800">
                            {plan.price_yearly_cop === null || plan.price_yearly_cop === undefined ? (
                              <span className="text-purple-600">Cotización</span>
                            ) : formatCurrency(plan.price_yearly_cop)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Sidebar ─── */}
        <div className="space-y-6">

          {/* ─── Assign Plan to Org ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-xl">
                <BuildingIcon className="w-5 h-5 text-purple-600" />
              </div>
              Asignar plan
            </h2>

            {/* Org selector */}
            <div className="space-y-3 mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Organización</label>
              {organizations.length > 5 && (
                <div className="relative mb-2">
                  <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar organización..."
                    value={orgSearchTerm}
                    onChange={(e) => setOrgSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-all"
                  />
                </div>
              )}
              <div className="max-h-52 overflow-y-auto space-y-1.5 border-2 border-gray-200 rounded-xl p-2.5 bg-gray-50/50">
                {filteredOrgs.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3 text-center">No hay organizaciones.</p>
                ) : (
                  filteredOrgs.map(org => {
                    const isSelected = org.id === selectedOrgId
                    const pc = getPlanColor(org.plan)
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => handleOrgChange(org.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-50 border-2 border-purple-300 text-purple-700 shadow-sm'
                            : 'hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{org.nombre}</p>
                          <p className="text-xs text-gray-500 font-mono">{org.codigo}</p>
                        </div>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${pc.bg} ${pc.text} border ${pc.border}`}>
                          {org.plan || 'FREE'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{organizations.length} organización{organizations.length !== 1 ? 'es' : ''} en el sistema</p>
            </div>

            {organization ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-gray-50 border-2 border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Seleccionada</p>
                  <p className="text-lg font-bold text-gray-800">{organization.nombre}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg border-2 border-gray-200 font-semibold text-gray-600">
                      <CreditCardIcon className="w-3.5 h-3.5" /> {organization.plan || 'FREE'}
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg border-2 border-gray-200 font-semibold text-gray-600">
                      <UsersIcon className="w-3.5 h-3.5" /> {organization.max_users} usuarios
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg border-2 border-gray-200 font-semibold text-gray-600">
                      <HardDriveIcon className="w-3.5 h-3.5" /> {organization.max_storage_mb} MB
                    </span>
                  </div>
                  {organization.is_trial && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 mt-3">
                      <p className="text-xs text-yellow-800 font-semibold">⚠️ En periodo de prueba</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nuevo plan</label>
                  <select
                    value={selectedPlanCode}
                    onChange={(e) => setSelectedPlanCode(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  >
                    <option value="">Seleccionar plan</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.code}>{plan.name} ({plan.code})</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Al aplicar, los límites se actualizan automáticamente</p>
                </div>

                <button
                  onClick={handleApplyPlan}
                  disabled={applyingPlan || !selectedPlanCode}
                  className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  {applyingPlan ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      <span>Aplicando...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightIcon className="w-5 h-5" />
                      <span>Aplicar plan</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Información:</strong> Selecciona una organización de la lista para asignar un plan.
                </p>
              </div>
            )}
          </div>

          {/* ─── Change History ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Historial de cambios</h2>
            {organization && (
              <p className="text-sm text-gray-500 mb-4">{organization.nombre}</p>
            )}

            {!organization ? (
              <p className="text-sm text-gray-500 py-4 text-center">Selecciona una organización para ver su historial.</p>
            ) : planHistory.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No hay cambios registrados.</p>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={exportHistoryCsv}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm"
                >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Exportar historial (CSV)</span>
                </button>
                {planHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border-2 border-gray-200 p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {item.previous_plan || 'N/A'} → {item.new_plan || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg">{item.changed_by_username || 'Sistema'}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-600 flex gap-3">
                      <span><UsersIcon className="w-3 h-3 inline mr-1" />{item.new_limits?.max_users ?? '-'}</span>
                      <span><HardDriveIcon className="w-3 h-3 inline mr-1" />{item.new_limits?.max_storage_mb ?? '-'} MB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Best Practices ─── */}
          <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Buenas prácticas</h3>
            <ul className="text-sm text-gray-600 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>Mantén un plan gratuito para onboarding de nuevos clientes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>Ordena los planes con <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">sort_order</span> para la landing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>Marca <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">Visible</span> solo si debe mostrarse en la landing pública.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>Usa precio vacío (cotización) para planes enterprise.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ─── Create/Edit Modal ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white p-6 rounded-t-2xl border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                    <CreditCardIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editingPlan ? 'Editar plan' : 'Nuevo plan'}</h2>
                    <p className="text-purple-100 text-sm">Configura precios, límites y visibilidad</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-mono uppercase"
                    placeholder="FREE, PRO, ENTERPRISE"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Identificador único, se convierte a mayúsculas</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="Profesional"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Nombre visible en la landing y el dashboard</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="Describe brevemente el plan"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio mensual (COP)</label>
                  <input
                    type="number"
                    value={formData.price_monthly_cop}
                    onChange={(e) => setFormData({ ...formData, price_monthly_cop: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="99000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío para modo cotización</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio anual (COP)</label>
                  <input
                    type="number"
                    value={formData.price_yearly_cop}
                    onChange={(e) => setFormData({ ...formData, price_yearly_cop: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="990000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar vacío para modo cotización</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Máx. usuarios</label>
                  <input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Storage (MB)</label>
                  <input
                    type="number"
                    value={formData.max_storage_mb}
                    onChange={(e) => setFormData({ ...formData, max_storage_mb: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Posición en la landing</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Características (1 por línea)</label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows="5"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition-all font-mono text-sm"
                  placeholder={"Nómina completa\nReportes avanzados\nSoporte prioritario"}
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Visible en landing</span>
                    <p className="text-xs text-gray-500">Se muestra en la página pública de precios</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-700">Plan activo</span>
                    <p className="text-xs text-gray-500">Disponible para asignación a organizaciones</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  <XIcon className="w-5 h-5" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg"
                >
                  {saving ? (
                    <>
                      <Loader2Icon className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-5 h-5" />
                      <span>{editingPlan ? 'Actualizar plan' : 'Crear plan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlanesPage
