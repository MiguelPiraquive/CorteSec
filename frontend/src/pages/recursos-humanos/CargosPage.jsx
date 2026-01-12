import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import cargosService from '../../services/cargosService'
import {
  BriefcaseIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  PowerIcon,
  TrendingUpIcon,
} from 'lucide-react'

const CargosPage = () => {
  const audit = useAudit('Cargos')
  const [cargos, setCargos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCargo, setEditingCargo] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(15)
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    cargo_superior: '',
    nivel_jerarquico: 1,
    salario_base_minimo: '',
    salario_base_maximo: '',
    requiere_aprobacion: false,
    puede_aprobar: false,
    activo: true,
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadCargos()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const loadCargos = async () => {
    try {
      setLoading(true)
      const data = await cargosService.getAllCargos()
      setCargos(data)
    } catch (error) {
      showNotification('error', 'Error al cargar cargos')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // DEBUG: Verificar tenant en localStorage
    console.log('=== DEBUG TENANT ===')
    console.log('tenantCode:', localStorage.getItem('tenantCode'))
    console.log('tenantSlug:', localStorage.getItem('tenantSlug'))
    console.log('authToken:', localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING')
    console.log('==================')
    
    try {
      const dataToSend = {
        ...formData,
        cargo_superior: formData.cargo_superior || null,
        salario_base_minimo: formData.salario_base_minimo || null,
        salario_base_maximo: formData.salario_base_maximo || null,
      }

      if (editingCargo) {
        await cargosService.updateCargo(editingCargo.id, dataToSend)
        audit.button('modificar_cargo', { cargo_id: editingCargo.id, nombre: formData.nombre });
        showNotification('success', 'Cargo actualizado exitosamente')
      } else {
        await cargosService.createCargo(dataToSend)
        audit.button('crear_cargo', { nombre: formData.nombre, codigo: formData.codigo });
        showNotification('success', 'Cargo creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      loadCargos()
    } catch (error) {
      console.error('Error completo:', error)
      console.error('Respuesta del servidor:', error.response?.data)
      console.error('Status:', error.response?.status)
      console.error('Headers enviados:', error.config?.headers)
      showNotification('error', error.response?.data?.message || error.response?.data?.error || 'Error al guardar cargo')
    }
  }

  const handleEdit = (cargo) => {
    setEditingCargo(cargo)
    setFormData({
      nombre: cargo.nombre,
      codigo: cargo.codigo || '',
      descripcion: cargo.descripcion || '',
      cargo_superior: cargo.cargo_superior || '',
      nivel_jerarquico: cargo.nivel_jerarquico || 1,
      salario_base_minimo: cargo.salario_base_minimo || '',
      salario_base_maximo: cargo.salario_base_maximo || '',
      requiere_aprobacion: cargo.requiere_aprobacion || false,
      puede_aprobar: cargo.puede_aprobar || false,
      activo: cargo.activo !== undefined ? cargo.activo : true,
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este cargo?')) return
    try {
      await cargosService.deleteCargo(id)
      showNotification('success', 'Cargo eliminado exitosamente')
      loadCargos()
    } catch (error) {
      showNotification('error', 'Error al eliminar cargo')
    }
  }

  const handleToggleActivo = async (cargo) => {
    try {
      await cargosService.toggleActivo(cargo.id)
      showNotification('success', `Cargo ${cargo.activo ? 'desactivado' : 'activado'} exitosamente`)
      loadCargos()
    } catch (error) {
      showNotification('error', 'Error al cambiar estado del cargo')
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      codigo: '',
      descripcion: '',
      cargo_superior: '',
      nivel_jerarquico: 1,
      salario_base_minimo: '',
      salario_base_maximo: '',
      requiere_aprobacion: false,
      puede_aprobar: false,
      activo: true,
    })
    setEditingCargo(null)
  }

  const filteredCargos = cargos.filter(cargo =>
    cargo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cargo.codigo && cargo.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cargo.descripcion && cargo.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedCargos = filteredCargos.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredCargos.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cargosSuperior = cargos.filter(c => c.activo)

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <BriefcaseIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Cargos</h1>
              <p className="text-indigo-100 mt-1">Gestión de cargos y estructura organizacional</p>
            </div>
          </div>
          <button onClick={() => { setShowModal(true); resetForm() }} className="flex items-center space-x-2 px-5 py-3 bg-white text-indigo-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Cargo</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, código o descripción..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Nivel</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Salarios</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Estado</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedCargos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No se encontraron cargos</td>
                </tr>
              ) : (
                paginatedCargos.map((cargo, index) => (
                  <tr key={cargo.id} className={`border-b border-gray-200/50 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-700">{cargo.codigo || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{cargo.nombre}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                        <TrendingUpIcon className="w-3 h-3" />
                        <span>Nivel {cargo.nivel_jerarquico}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cargo.salario_base_minimo ? (
                        <div className="text-xs">
                          <div>Min: ${Number(cargo.salario_base_minimo).toLocaleString()}</div>
                          {cargo.salario_base_maximo && <div>Max: ${Number(cargo.salario_base_maximo).toLocaleString()}</div>}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full font-semibold ${cargo.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {cargo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleToggleActivo(cargo)} className={`p-2 rounded-lg transition-all transform hover:scale-110 ${cargo.activo ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title={cargo.activo ? 'Desactivar' : 'Activar'}>
                          <PowerIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(cargo)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-110">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cargo.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all transform hover:scale-110">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredCargos.length > pageSize && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-900">{startIndex + 1}</span> a{' '}
                <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredCargos.length)}</span> de{' '}
                <span className="font-semibold text-gray-900">{filteredCargos.length}</span> cargos
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Primera
                </button>
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Anterior
                </button>
                <div className="flex items-center space-x-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button key={i} onClick={() => handlePageChange(pageNum)} className={`px-4 py-2 rounded-lg transition-all ${currentPage === pageNum ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Siguiente
                </button>
                <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  Última
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-3xl border border-gray-200/50 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-2xl font-bold">{editingCargo ? 'Editar Cargo' : 'Nuevo Cargo'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código *</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                  <textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows="3" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cargo Superior 
                    <span className="text-gray-400 text-xs ml-2">(Opcional - Para jerarquía)</span>
                  </label>
                  <select value={formData.cargo_superior} onChange={(e) => setFormData({...formData, cargo_superior: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all">
                    <option value="">Ninguno (Cargo de nivel superior)</option>
                    {cargosSuperior.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} - Nivel {c.nivel_jerarquico}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Define de quién depende este cargo en el organigrama</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nivel Jerárquico</label>
                  <input type="number" min="1" value={formData.nivel_jerarquico} onChange={(e) => setFormData({...formData, nivel_jerarquico: parseInt(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salario Base Mínimo</label>
                  <input type="number" step="0.01" value={formData.salario_base_minimo} onChange={(e) => setFormData({...formData, salario_base_minimo: e.target.value})} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salario Base Máximo</label>
                  <input type="number" step="0.01" value={formData.salario_base_maximo} onChange={(e) => setFormData({...formData, salario_base_maximo: e.target.value})} placeholder="0.00" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.requiere_aprobacion} onChange={(e) => setFormData({...formData, requiere_aprobacion: e.target.checked})} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Requiere aprobación para contratación</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.puede_aprobar} onChange={(e) => setFormData({...formData, puede_aprobar: e.target.checked})} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Puede aprobar acciones de otros</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData({...formData, activo: e.target.checked})} className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">Cargo activo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-semibold shadow-lg">
                  {editingCargo ? 'Actualizar' : 'Crear'} Cargo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CargosPage
