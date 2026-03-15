import { useState, useCallback } from 'react'
import useAudit from '../../hooks/useAudit'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import useServerPagination from '../../hooks/useServerPagination'
import Pagination from '../../components/Pagination'
import locationsService from '../../services/locationsService'
import {
  MapPinIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  UploadIcon,
  DownloadIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  FileSpreadsheetIcon,
} from 'lucide-react'

const DepartamentosPage = () => {
  const audit = useAudit('Departamentos')
  const { hasPermission, initialized } = usePermissions()
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingDepartamento, setEditingDepartamento] = useState(null)
  const [excelFile, setExcelFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)

  const fetchDepartamentos = useCallback((params) => locationsService.getDepartamentos(params), [])
  const {
    data: departamentos,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    refresh,
  } = useServerPagination(fetchDepartamentos, { pageSize: 20 })
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    capital: '',
    region: '',
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDepartamento) {
        await locationsService.updateDepartamento(editingDepartamento.id, formData)
        audit.button('modificar_departamento', { depto_id: editingDepartamento.id, nombre: formData.nombre });
        showNotification('success', 'Departamento actualizado exitosamente')
      } else {
        await locationsService.createDepartamento(formData)
        audit.button('crear_departamento', { nombre: formData.nombre, codigo: formData.codigo });
        showNotification('success', 'Departamento creado exitosamente')
      }
      setShowModal(false)
      setFormData({ nombre: '', codigo: '', capital: '', region: '' })
      setEditingDepartamento(null)
      refresh()
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Error al guardar departamento')
    }
  }

  const handleEdit = (departamento) => {
    setEditingDepartamento(departamento)
    setFormData({
      nombre: departamento.nombre,
      codigo: departamento.codigo || '',
      capital: departamento.capital || '',
      region: departamento.region || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este departamento?')) return
    try {
      await locationsService.deleteDepartamento(id)
      showNotification('success', 'Departamento eliminado exitosamente')
      refresh()
    } catch (error) {
      showNotification('error', 'Error al eliminar departamento')
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
      refresh()
    } catch (error) {
      showNotification('error', error.response?.data?.error || 'Error al procesar archivo')
    }
  }

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('departamentos.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

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
      <div className="backdrop-blur-xl bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <MapPinIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Departamentos</h1>
              <p className="text-teal-100 mt-1">Gestión de departamentos de Colombia</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Can permission="departamentos.add">
              <button onClick={() => setShowUploadModal(true)} className="flex items-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold border border-white/30">
                <UploadIcon className="w-5 h-5" />
                <span>Importar Excel</span>
              </button>
            </Can>
            <Can permission="departamentos.add">
              <button onClick={() => { setShowModal(true); setEditingDepartamento(null); setFormData({ nombre: '', codigo: '', capital: '', region: '' }) }} className="flex items-center space-x-2 px-5 py-3 bg-white text-teal-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
                <PlusIcon className="w-5 h-5" />
                <span>Nuevo Departamento</span>
              </button>
            </Can>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o código..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all" />
        </div>
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <th className="px-6 py-4 text-left text-sm font-bold">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Capital</th>
                <th className="px-6 py-4 text-left text-sm font-bold">Región</th>
                <th className="px-6 py-4 text-center text-sm font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-3">
                      <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : departamentos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No se encontraron departamentos</td>
                </tr>
              ) : (
                departamentos.map((dep, index) => (
                  <tr key={dep.id} className={`border-b border-gray-200/50 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 text-sm font-mono font-semibold text-gray-700">{dep.codigo || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{dep.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{dep.capital || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{dep.region || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center space-x-2">
                        <Can permission="departamentos.change">
                          <button onClick={() => handleEdit(dep)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all transform hover:scale-110">
                            <EditIcon className="w-4 h-4" />
                          </button>
                        </Can>
                        <Can permission="departamentos.delete">
                          <button onClick={() => handleDelete(dep.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all transform hover:scale-110">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacion */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="departamentos"
        />
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-2xl border border-gray-200/50 animate-scale-in">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-2xl font-bold">{editingDepartamento ? 'Editar Departamento' : 'Nuevo Departamento'}</h2>
                <button onClick={() => { setShowModal(false); setEditingDepartamento(null) }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all" placeholder="Ej: Cundinamarca" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all" placeholder="Ej: 25" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Capital</label>
                  <input type="text" value={formData.capital} onChange={(e) => setFormData({ ...formData, capital: e.target.value })} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all" placeholder="Ej: Bogotá" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Región</label>
                  <input type="text" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:outline-none focus:border-teal-500 focus:bg-white transition-all" placeholder="Ej: Andina" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); setEditingDepartamento(null) }} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold shadow-lg">
                  {editingDepartamento ? 'Actualizar' : 'Crear'}
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
                  <li>• <strong>nombre_municipio</strong> (opcional, para crear municipios)</li>
                  <li>• <strong>codigo_municipio</strong> (opcional)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-500 transition-all">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="excel-upload" />
                <label htmlFor="excel-upload" className="cursor-pointer">
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

export default DepartamentosPage
