import { useState, useEffect } from 'react'
import useAudit from '../../hooks/useAudit'
import locationsService from '../../services/locationsService'
import {
  MapIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  FileSpreadsheetIcon,
} from 'lucide-react'

const MunicipiosPage = () => {
  const audit = useAudit('Municipios')
  const [municipios, setMunicipios] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingMunicipio, setEditingMunicipio] = useState(null)
  const [excelFile, setExcelFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [pageSize] = useState(20)
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    departamento: '',
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterDepartamento])

  const loadData = async () => {
    try {
      setLoading(true)
      const [municipiosData, departamentosData] = await Promise.all([
        locationsService.getAllMunicipios(),
        locationsService.getAllDepartamentos(),
      ])
      setMunicipios(municipiosData)
      setDepartamentos(departamentosData)
      setTotalCount(municipiosData.length)
      setTotalPages(Math.ceil(municipiosData.length / pageSize))
      setCurrentPage(1)
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
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
    try {
      if (editingMunicipio) {
        await locationsService.updateMunicipio(editingMunicipio.id, formData)
        audit.button('modificar_municipio', { municipio_id: editingMunicipio.id, nombre: formData.nombre });
        showNotification('success', 'Municipio actualizado exitosamente')
      } else {
        await locationsService.createMunicipio(formData)
        audit.button('crear_municipio', { nombre: formData.nombre, codigo: formData.codigo });
        showNotification('success', 'Municipio creado exitosamente')
      }
      setShowModal(false)
      setFormData({ nombre: '', codigo: '', departamento: '' })
      setEditingMunicipio(null)
      loadData()
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Error al guardar municipio')
    }
  }

  const handleEdit = (municipio) => {
    setEditingMunicipio(municipio)
    setFormData({
      nombre: municipio.nombre,
      codigo: municipio.codigo || '',
      departamento: municipio.departamento?.id || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este municipio?')) return
    try {
      await locationsService.deleteMunicipio(id)
      showNotification('success', 'Municipio eliminado exitosamente')
      loadData()
    } catch (error) {
      showNotification('error', 'Error al eliminar municipio')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setExcelFile(file)
    }
  }

  const handleUploadExcel = async () => {
    if (!excelFile) {
      showNotification('error', 'Por favor seleccione un archivo')
      return
    }

    try {
      const result = await locationsService.uploadExcel(excelFile)
      setUploadResult(result)
      showNotification('success', 'Archivo procesado exitosamente')
      loadData()
    } catch (error) {
      showNotification('error', error.response?.data?.error || 'Error al procesar archivo')
    }
  }

  const getDepartamentoNombre = (depId) => {
    const dep = departamentos.find(d => d.id === depId)
    return dep ? dep.nombre : 'N/A'
  }

  const filteredMunicipios = municipios.filter(mun => {
    const matchSearch = mun.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mun.codigo && mun.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchDepartamento = !filterDepartamento || mun.departamento?.id === filterDepartamento
    return matchSearch && matchDepartamento
  })

  // Paginación de datos filtrados
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMunicipios = filteredMunicipios.slice(startIndex, endIndex)
  const filteredTotalPages = Math.ceil(filteredMunicipios.length / pageSize)

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= filteredTotalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-20 right-6 z-50 backdrop-blur-xl rounded-2xl shadow-2xl p-4 border animate-slide-in-from-top ${notification.type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? <CheckIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
            <span className="font-semibold">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <MapIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Municipios</h1>
              <p className="text-emerald-100 mt-1">Gestión de municipios por departamento</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button onClick={() => setShowUploadModal(true)} className="flex items-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold border border-white/30">
              <UploadIcon className="w-5 h-5" />
              <span>Importar Excel</span>
            </button>
            <button onClick={() => { setShowModal(true); setEditingMunicipio(null); setFormData({ nombre: '', codigo: '', departamento: '' }) }} className="flex items-center space-x-2 px-5 py-3 bg-white text-emerald-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
              <PlusIcon className="w-5 h-5" />
              <span>Nuevo Municipio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o código..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" />
          </div>
          <select value={filterDepartamento} onChange={(e) => setFilterDepartamento(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
            <option value="">Todos los departamentos</option>
            {departamentos.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Departamento</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMunicipios.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No se encontraron municipios</td>
                </tr>
              ) : (
                paginatedMunicipios.map((mun, index) => (
                  <tr key={mun.id} className={`border-b border-gray-200/50 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-700">{mun.codigo || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{mun.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{mun.departamento?.nombre || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => handleEdit(mun)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-110">
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(mun.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all transform hover:scale-110">
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

        {/* Paginación */}
        {filteredMunicipios.length > pageSize && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-900">{startIndex + 1}</span> a{' '}
                <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredMunicipios.length)}</span> de{' '}
                <span className="font-semibold text-gray-900">{filteredMunicipios.length}</span> municipios
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Primera
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <div className="flex items-center space-x-2">
                  {[...Array(Math.min(5, filteredTotalPages))].map((_, i) => {
                    let pageNum
                    if (filteredTotalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= filteredTotalPages - 2) {
                      pageNum = filteredTotalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === filteredTotalPages}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente
                </button>
                <button
                  onClick={() => handlePageChange(filteredTotalPages)}
                  disabled={currentPage === filteredTotalPages}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Última
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50 animate-scale-in">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-2xl font-bold">{editingMunicipio ? 'Editar Municipio' : 'Nuevo Municipio'}</h2>
                <button onClick={() => { setShowModal(false); setEditingMunicipio(null) }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ej: Bogotá D.C." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" placeholder="Ej: 11001" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Departamento *</label>
                <select value={formData.departamento} onChange={(e) => setFormData({ ...formData, departamento: e.target.value })} required className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all">
                  <option value="">Seleccionar departamento</option>
                  {departamentos.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setEditingMunicipio(null) }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-lg">
                  {editingMunicipio ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Excel Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50 animate-scale-in">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheetIcon className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Importar desde Excel</h2>
                </div>
                <button onClick={() => { setShowUploadModal(false); setExcelFile(null); setUploadResult(null) }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">📋 Formato del archivo Excel:</p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>• <strong>nombre_departamento</strong> (obligatorio)</li>
                  <li>• <strong>codigo_departamento</strong> (opcional)</li>
                  <li>• <strong>nombre_municipio</strong> (obligatorio)</li>
                  <li>• <strong>codigo_municipio</strong> (opcional)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-all">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="excel-upload-mun" />
                <label htmlFor="excel-upload-mun" className="cursor-pointer">
                  <UploadIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-700 font-semibold mb-2">{excelFile ? excelFile.name : 'Seleccionar archivo Excel'}</p>
                  <p className="text-sm text-gray-500">Haz clic o arrastra el archivo aquí</p>
                </label>
              </div>

              {uploadResult && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-green-900 font-semibold mb-2">✅ Resultado de la importación:</p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Departamentos creados: <strong>{uploadResult.created_deptos || 0}</strong></li>
                    <li>• Municipios creados: <strong>{uploadResult.created_mpios || 0}</strong></li>
                    <li>• Registros omitidos: <strong>{uploadResult.skipped || 0}</strong></li>
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button onClick={() => { setShowUploadModal(false); setExcelFile(null); setUploadResult(null) }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold">
                  Cerrar
                </button>
                <button onClick={handleUploadExcel} disabled={!excelFile} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  Procesar Archivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MunicipiosPage
