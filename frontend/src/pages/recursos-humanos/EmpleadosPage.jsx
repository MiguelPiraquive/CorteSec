import { useState, useEffect, useCallback } from 'react'
import useAudit from '../../hooks/useAudit'
import useServerPagination from '../../hooks/useServerPagination'
import Pagination from '../../components/Pagination'
import empleadosService from '../../services/empleadosService'
import cargosService from '../../services/cargosService'
import locationsService from '../../services/locationsService'
import usuariosService from '../../services/usuariosService'
import Can from '../../components/permissions/Can'
import { usePermissions } from '../../context/PermissionsContext'
import { useActiveProject } from '../../context/ActiveProjectContext'
import {
  UsersIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SearchIcon,
  XIcon,
  CheckIcon,
  AlertCircleIcon,
  UploadIcon,
  UserCircleIcon,
  MailIcon,
  PhoneIcon,
  BriefcaseIcon,
} from 'lucide-react'
import useProductTour from '../../hooks/useProductTour'
import { TOUR_CONFIGS } from '../../data/tourConfigs'

const EmpleadosPage = () => {
  const audit = useAudit('Empleados')
  const { hasPermission, initialized } = usePermissions()
  const { activeProject, getProjectFilter } = useActiveProject()

  // Server-side pagination
  const pf = getProjectFilter()
  const fetchEmpleados = useCallback((params) => empleadosService.getEmpleados({ ...params, ...pf }), [activeProject])
  const {
    data: empleados,
    loading,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    setFilters,
    refresh,
  } = useServerPagination(fetchEmpleados, { pageSize: 12 })

  // Dropdown data (loaded separately, not paginated)
  const [cargos, setCargos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // Local filter state for dropdowns
  const [filterCargo, setFilterCargo] = useState('')
  const [filterGenero, setFilterGenero] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingEmpleado, setEditingEmpleado] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const [formData, setFormData] = useState({
    tipo_documento: 'CC',
    numero_documento: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    fecha_nacimiento: '',
    genero: '',
    email: '',
    telefono: '',
    direccion: '',
    departamento: '',
    ciudad: '',
    foto: null,
    estado: 'activo',
    fecha_ingreso: '',
    fecha_retiro: '',
    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',
    observaciones: '',
    usuario: '', // Usuario vinculado opcional
  })

  const [notification, setNotification] = useState({ show: false, type: '', message: '' })

  // Load dropdown data on mount
  useEffect(() => {
    loadDropdownData()
  }, [])

  // Sync local filter state to the hook's filters
  useEffect(() => {
    const f = {}
    if (filterCargo) f.cargo = filterCargo
    if (filterGenero) f.genero = filterGenero
    setFilters(f)
  }, [filterCargo, filterGenero, setFilters])

  useProductTour('empleados', TOUR_CONFIGS.empleados.steps, {
    ready: !loading && initialized,
  })

  const loadDropdownData = async () => {
    try {
      const [cargosData, departamentosData, usuariosData] = await Promise.all([
        cargosService.getAllCargos(),
        locationsService.getSimpleDepartamentos(),
        usuariosService.getUsuarios({ is_active: true }).catch(() => []),
      ])
      setCargos(cargosData.filter(c => c.activo))
      setDepartamentos(departamentosData)
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : usuariosData.results || [])
    } catch (error) {
      showNotification('error', 'Error al cargar datos')
      console.error('Error:', error)
    }
  }

  const loadMunicipiosByDepartamento = async (departamentoId) => {
    try {
      console.log('Cargando municipios para departamento:', departamentoId)
      const municipiosData = await locationsService.getMunicipiosByDepartamento(departamentoId)
      setMunicipios(municipiosData)
    } catch (error) {
      console.error('Error al cargar municipios:', error)
      setMunicipios([])
    }
  }

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message })
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 4000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Si hay foto, usar FormData, sino JSON normal
      let dataToSend

      if (formData.foto && formData.foto instanceof File) {
        // Crear FormData para enviar archivo
        dataToSend = new FormData()
        dataToSend.append('tipo_documento', formData.tipo_documento)
        dataToSend.append('numero_documento', formData.numero_documento)
        dataToSend.append('primer_nombre', formData.primer_nombre)
        dataToSend.append('segundo_nombre', formData.segundo_nombre || '')
        dataToSend.append('primer_apellido', formData.primer_apellido)
        dataToSend.append('segundo_apellido', formData.segundo_apellido || '')
        if (formData.fecha_nacimiento) dataToSend.append('fecha_nacimiento', formData.fecha_nacimiento)
        dataToSend.append('genero', formData.genero || '')
        dataToSend.append('email', formData.email || '')
        dataToSend.append('telefono', formData.telefono || '')
        dataToSend.append('direccion', formData.direccion || '')
        if (formData.departamento) dataToSend.append('departamento', formData.departamento)
        if (formData.ciudad) dataToSend.append('ciudad', formData.ciudad)
        dataToSend.append('estado', formData.estado || 'activo')
        dataToSend.append('fecha_ingreso', formData.fecha_ingreso || new Date().toISOString().split('T')[0])
        if (formData.fecha_retiro) dataToSend.append('fecha_retiro', formData.fecha_retiro)
        dataToSend.append('banco', formData.banco || '')
        dataToSend.append('tipo_cuenta', formData.tipo_cuenta || '')
        dataToSend.append('numero_cuenta', formData.numero_cuenta || '')
        dataToSend.append('observaciones', formData.observaciones || '')
        if (formData.usuario) dataToSend.append('usuario', formData.usuario)
        dataToSend.append('foto', formData.foto)
      } else {
        // JSON normal sin foto nueva - NO incluir campo foto
        dataToSend = {
          tipo_documento: formData.tipo_documento,
          numero_documento: formData.numero_documento,
          primer_nombre: formData.primer_nombre,
          segundo_nombre: formData.segundo_nombre || '',
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido || '',
          fecha_nacimiento: formData.fecha_nacimiento || null,
          genero: formData.genero || '',
          email: formData.email || '',
          telefono: formData.telefono || '',
          direccion: formData.direccion || '',
          departamento: formData.departamento || null,
          ciudad: formData.ciudad || null,
          estado: formData.estado || 'activo',
          fecha_ingreso: formData.fecha_ingreso || new Date().toISOString().split('T')[0],
          fecha_retiro: formData.fecha_retiro || null,
          banco: formData.banco || '',
          tipo_cuenta: formData.tipo_cuenta || '',
          numero_cuenta: formData.numero_cuenta || '',
          observaciones: formData.observaciones || '',
          usuario: formData.usuario || null,
          // NO enviar foto: null - backend lo rechaza
        }
      }

      if (editingEmpleado) {
        await empleadosService.updateEmpleado(editingEmpleado.id, dataToSend)
        audit.button('modificar_empleado', { empleado_id: editingEmpleado.id, documento: formData.numero_documento });
        showNotification('success', 'Empleado actualizado exitosamente')
      } else {
        await empleadosService.createEmpleado(dataToSend)
        audit.button('crear_empleado', { documento: formData.numero_documento, nombres: formData.primer_nombre });
        showNotification('success', 'Empleado creado exitosamente')
      }
      setShowModal(false)
      resetForm()
      refresh()
    } catch (error) {
      console.error('Error guardando:', error)
      console.error('Detalle del error:', error.response?.data)
      showNotification('error', error.response?.data?.message || 'Error al guardar empleado')
    }
  }

  const handleEdit = async (empleado) => {
    audit.modalOpen('editar_empleado', { empleado_id: empleado.id, documento: empleado.numero_documento });
    setEditingEmpleado(empleado)

    // Extraer IDs correctamente (pueden venir como UUID string o como objeto {id: uuid})
    const departamentoId = typeof empleado.departamento === 'object' ? empleado.departamento?.id : empleado.departamento
    const ciudadId = typeof empleado.ciudad === 'object' ? empleado.ciudad?.id : empleado.ciudad

    setFormData({
      tipo_documento: empleado.tipo_documento || 'CC',
      numero_documento: empleado.numero_documento || '',
      primer_nombre: empleado.primer_nombre || '',
      segundo_nombre: empleado.segundo_nombre || '',
      primer_apellido: empleado.primer_apellido || '',
      segundo_apellido: empleado.segundo_apellido || '',
      fecha_nacimiento: empleado.fecha_nacimiento || '',
      genero: empleado.genero || '',
      email: empleado.email || '',
      telefono: empleado.telefono || '',
      direccion: empleado.direccion || '',
      departamento: departamentoId || '',
      ciudad: ciudadId || '',
      foto: null,
      estado: empleado.estado || 'activo',
      fecha_ingreso: empleado.fecha_ingreso || '',
      fecha_retiro: empleado.fecha_retiro || '',
      banco: empleado.banco || '',
      tipo_cuenta: empleado.tipo_cuenta || '',
      numero_cuenta: empleado.numero_cuenta || '',
      observaciones: empleado.observaciones || '',
    })

    // Cargar municipios si hay departamento seleccionado
    if (departamentoId) {
      await loadMunicipiosByDepartamento(departamentoId)
    }

    if (empleado.foto) {
      setPreviewImage(empleado.foto)
    }
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este empleado?')) return
    try {
      await empleadosService.deleteEmpleado(id)
      showNotification('success', 'Empleado eliminado exitosamente')
      refresh()
    } catch (error) {
      showNotification('error', 'Error al eliminar empleado')
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, foto: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDepartamentoChange = (e) => {
    const depId = e.target.value
    setFormData({ ...formData, departamento: depId, ciudad: '' })
    setMunicipios([])

    if (depId && depId.trim() !== '') {
      loadMunicipiosByDepartamento(depId)
    }
  }

  const handleUsuarioChange = async (e) => {
    const usuarioId = e.target.value

    if (!usuarioId) {
      setFormData({ ...formData, usuario: '' })
      return
    }

    try {
      // Obtener datos del usuario con su perfil
      const usuario = await usuariosService.getUsuario(usuarioId)

      // Autocompletar datos desde el perfil si existen
      if (usuario.perfil_detalle) {
        const perfil = usuario.perfil_detalle
        const newFormData = { ...formData, usuario: usuarioId }

        // Autocompletar nombres y apellidos desde el usuario
        if (!formData.primer_nombre && perfil.first_name) {
          const nombres = perfil.first_name.trim().split(' ')
          newFormData.primer_nombre = nombres[0] || ''
          newFormData.segundo_nombre = nombres.slice(1).join(' ') || ''
        }

        if (!formData.primer_apellido && perfil.last_name) {
          const apellidos = perfil.last_name.trim().split(' ')
          newFormData.primer_apellido = apellidos[0] || ''
          newFormData.segundo_apellido = apellidos.slice(1).join(' ') || ''
        }

        // Autocompletar género
        if (!formData.genero && perfil.genero) {
          const generoMap = {
            'masculino': 'M',
            'femenino': 'F',
            'otro': 'O'
          }
          newFormData.genero = generoMap[perfil.genero.toLowerCase()] || ''
        }

        // Autocompletar otros campos del perfil
        if (!formData.email && usuario.email) newFormData.email = usuario.email
        if (!formData.telefono && perfil.telefono) newFormData.telefono = perfil.telefono
        if (!formData.direccion && perfil.direccion_residencia) newFormData.direccion = perfil.direccion_residencia
        if (!formData.fecha_nacimiento && perfil.fecha_nacimiento) newFormData.fecha_nacimiento = perfil.fecha_nacimiento
        if (!formData.numero_documento && perfil.numero_cedula) newFormData.numero_documento = perfil.numero_cedula
        if (!formData.banco && perfil.banco) newFormData.banco = perfil.banco
        if (!formData.tipo_cuenta && perfil.tipo_cuenta) newFormData.tipo_cuenta = perfil.tipo_cuenta
        if (!formData.numero_cuenta && perfil.numero_cuenta) newFormData.numero_cuenta = perfil.numero_cuenta

        // Autocompletar departamento y ciudad por nombre
        if (!formData.departamento && perfil.departamento_residencia) {
          const depNombre = perfil.departamento_residencia.toUpperCase()
          const depEncontrado = departamentos.find(d => d.nombre.toUpperCase() === depNombre)
          if (depEncontrado) {
            newFormData.departamento = depEncontrado.id

            // Cargar municipios del departamento
            try {
              const municipiosData = await locationsService.getMunicipiosByDepartamento(depEncontrado.id)
              setMunicipios(municipiosData)

              // Buscar ciudad
              if (perfil.ciudad_residencia) {
                const ciudadNombre = perfil.ciudad_residencia.toUpperCase()
                const ciudadEncontrada = municipiosData.find(m => m.nombre.toUpperCase() === ciudadNombre)
                if (ciudadEncontrada) {
                  newFormData.ciudad = ciudadEncontrada.id
                }
              }
            } catch (error) {
              console.error('Error cargando municipios:', error)
            }
          }
        }

        setFormData(newFormData)
        showNotification('success', 'Datos autocompletados desde el perfil del usuario')
      } else {
        // Solo actualizar el usuario si no hay perfil
        setFormData({ ...formData, usuario: usuarioId })
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error)
      showNotification('error', 'Error al cargar datos del usuario')
      setFormData({ ...formData, usuario: usuarioId })
    }
  }

  const resetForm = () => {
    setFormData({
      tipo_documento: 'CC',
      numero_documento: '',
      primer_nombre: '',
      segundo_nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      fecha_nacimiento: '',
      genero: '',
      email: '',
      telefono: '',
      direccion: '',
      departamento: '',
      ciudad: '',
      foto: null,
      estado: 'activo',
      fecha_ingreso: '',
      fecha_retiro: '',
      banco: '',
      tipo_cuenta: '',
      numero_cuenta: '',
      observaciones: '',
      usuario: '',
    })
    setMunicipios([])
    setEditingEmpleado(null)
    setPreviewImage(null)
  }

  const getCargoNombre = (empleado) => {
    return empleado.cargo_actual?.nombre || empleado.contrato_activo?.cargo?.nombre || 'Sin cargo'
  }
  const getGeneroLabel = (genero) => {
    const map = { 'M': 'Masculino', 'F': 'Femenino', 'O': 'Otro' }
    return map[genero] || genero
  }

  if (!initialized) return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
  if (!hasPermission('empleados.view')) return <div className="p-8 text-center text-red-500 font-semibold">No tienes permisos para acceder a esta sección</div>

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
      <div id="tour-empleados-header" className="backdrop-blur-xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl shadow-2xl p-8 text-white border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <UsersIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Empleados</h1>
              <p className="text-green-100 mt-1">Gestión integral del personal</p>
            </div>
          </div>
          <Can permission="empleados.add">
            <button id="tour-empleados-btn-nuevo" onClick={() => { setShowModal(true); resetForm() }} className="flex items-center space-x-2 px-5 py-3 bg-white text-green-600 hover:bg-gray-100 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold shadow-lg">
              <PlusIcon className="w-5 h-5" />
              <span>Nuevo Empleado</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Filters */}
      <div id="tour-empleados-filters" className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg p-6 border border-gray-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o documento..." className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white transition-all" />
          </div>
          <select value={filterCargo} onChange={(e) => setFilterCargo(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white transition-all">
            <option value="">Todos los cargos</option>
            {cargos.map(cargo => (
              <option key={cargo.id} value={cargo.id}>{cargo.nombre}</option>
            ))}
          </select>
          <select value={filterGenero} onChange={(e) => setFilterGenero(e.target.value)} className="w-full px-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl text-gray-800 focus:outline-none focus:border-green-500 focus:bg-white transition-all">
            <option value="">Todos los géneros</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div id="tour-empleados-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Cargando empleados...</span>
            </div>
          </div>
        ) : empleados.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No se encontraron empleados
          </div>
        ) : (
          empleados.map((empleado) => (
            <div key={empleado.id} className="backdrop-blur-xl bg-white/90 rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 text-white">
                <div className="flex items-center justify-center mb-3">
                  {empleado.foto ? (
                    <img src={empleado.foto} alt={empleado.nombre_completo} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <UserCircleIcon className="w-16 h-16" />
                    </div>
                  )}
                </div>
                <h3 className="text-center font-bold text-lg">{empleado.nombre_completo}</h3>
                <p className="text-center text-sm text-green-100 mt-1">{empleado.documento}</p>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <BriefcaseIcon className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">{getCargoNombre(empleado)}</span>
                </div>
                {empleado.correo && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MailIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700 truncate">{empleado.correo}</span>
                  </div>
                )}
                {empleado.telefono && (
                  <div className="flex items-center space-x-2 text-sm">
                    <PhoneIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-gray-700">{empleado.telefono}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm">
                  <UsersIcon className="w-4 h-4 text-orange-600" />
                  <span className="text-gray-700">{getGeneroLabel(empleado.genero)}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      empleado.estado === 'activo' ? 'bg-green-100 text-green-700' :
                      empleado.estado === 'retirado' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {empleado.estado === 'activo' ? 'Activo' : empleado.estado === 'inactivo' ? 'Inactivo' : 'Retirado'}
                    </span>
                    <div className="flex space-x-1">
                      <Can permission="empleados.change">
                        <button onClick={() => handleEdit(empleado)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all">
                          <EditIcon className="w-4 h-4" />
                        </button>
                      </Can>
                      <Can permission="empleados.delete">
                        <button onClick={() => handleDelete(empleado.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </Can>
                    </div>
                  </div>
                  {empleado.tiene_usuario && (
                    <div className="flex items-center justify-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                      <CheckIcon className="w-3 h-3" />
                      <span>Acceso al Sistema</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemLabel="empleados"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/95 rounded-3xl shadow-2xl w-full max-w-4xl border border-gray-200/50 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 rounded-t-3xl sticky top-0 z-10">
              <div className="flex items-center justify-between text-white">
                <h2 className="text-2xl font-bold">{editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                <button onClick={() => { setShowModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-xl transition-all">
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Foto */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-lg" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-300">
                      <UserCircleIcon className="w-20 h-20 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-2 bg-green-500 text-white rounded-full cursor-pointer hover:bg-green-600 transition-all shadow-lg">
                    <UploadIcon className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
                <p className="text-sm text-gray-600">Click para cargar foto del empleado</p>
              </div>

              {/* Vinculación con Usuario del Sistema */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <UserCircleIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Vinculación con Usuario del Sistema (Opcional)</h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Si el empleado necesita acceso al sistema, vincúlalo con un usuario existente. Los datos del perfil se autocompletarán automáticamente.
                </p>
                <select
                  value={formData.usuario}
                  onChange={handleUsuarioChange}
                  className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">Seleccionar usuario (opcional)</option>
                  {usuarios.map(usuario => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.first_name} {usuario.last_name} ({usuario.email})
                    </option>
                  ))}
                </select>
                {formData.usuario && (
                  <div className="mt-3 flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                    <CheckIcon className="w-4 h-4" />
                    <span>Este empleado tendrá acceso al sistema</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Documento *</label>
                  <select value={formData.tipo_documento} onChange={(e) => setFormData({...formData, tipo_documento: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" required>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="TI">Tarjeta de Identidad</option>
                    <option value="PA">Pasaporte</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>

                {/* Número de Documento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Documento *</label>
                  <input type="text" value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" required />
                </div>

                {/* Primer Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primer Nombre *</label>
                  <input type="text" value={formData.primer_nombre} onChange={(e) => setFormData({...formData, primer_nombre: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" required />
                </div>

                {/* Segundo Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Segundo Nombre</label>
                  <input type="text" value={formData.segundo_nombre} onChange={(e) => setFormData({...formData, segundo_nombre: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Primer Apellido */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Primer Apellido *</label>
                  <input type="text" value={formData.primer_apellido} onChange={(e) => setFormData({...formData, primer_apellido: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" required />
                </div>

                {/* Segundo Apellido */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Segundo Apellido</label>
                  <input type="text" value={formData.segundo_apellido} onChange={(e) => setFormData({...formData, segundo_apellido: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Nacimiento</label>
                  <input type="date" value={formData.fecha_nacimiento} onChange={(e) => setFormData({...formData, fecha_nacimiento: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Género */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Género</label>
                  <select value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all">
                    <option value="">Seleccione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                  <input type="text" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                  <input type="text" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Departamento</label>
                  <select value={formData.departamento} onChange={handleDepartamentoChange} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all">
                    <option value="">Seleccione un departamento</option>
                    {departamentos.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Ciudad/Municipio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad/Municipio</label>
                  <select value={formData.ciudad} onChange={(e) => setFormData({...formData, ciudad: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all disabled:opacity-50" disabled={!formData.departamento}>
                    <option value="">Seleccione una ciudad</option>
                    {municipios.map(mun => (
                      <option key={mun.id} value={mun.id}>{mun.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Estado *</label>
                  <select value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" required>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="retirado">Retirado</option>
                  </select>
                </div>

                {/* Fecha de Ingreso */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Ingreso</label>
                  <input type="date" value={formData.fecha_ingreso} onChange={(e) => setFormData({...formData, fecha_ingreso: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Fecha de Retiro */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Retiro</label>
                  <input type="date" value={formData.fecha_retiro} onChange={(e) => setFormData({...formData, fecha_retiro: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Banco */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Banco</label>
                  <input type="text" value={formData.banco} onChange={(e) => setFormData({...formData, banco: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Tipo de Cuenta */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Cuenta</label>
                  <select value={formData.tipo_cuenta} onChange={(e) => setFormData({...formData, tipo_cuenta: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all">
                    <option value="">Seleccione</option>
                    <option value="ahorros">Cuenta de Ahorros</option>
                    <option value="corriente">Cuenta Corriente</option>
                  </select>
                </div>

                {/* Número de Cuenta */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Cuenta</label>
                  <input type="text" value={formData.numero_cuenta} onChange={(e) => setFormData({...formData, numero_cuenta: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all" />
                </div>

                {/* Observaciones */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea value={formData.observaciones} onChange={(e) => setFormData({...formData, observaciones: e.target.value})} rows="3" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"></textarea>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold">
                  Cancelar
                </button>
                <button type="submit" className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl hover:from-green-600 hover:to-teal-700 transition-all font-semibold shadow-lg">
                  {editingEmpleado ? 'Actualizar' : 'Crear'} Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmpleadosPage
