import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import {
  UserCircleIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  HeartIcon,
  AcademicCapIcon,
  BanknotesIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import {
  getMiPerfil,
  actualizarMiPerfilParcial,
  subirFotoPerfil,
  getConfigNotificaciones,
  actualizarConfigNotificacionesParcial,
  cambiarContrasena,
} from '../../services/perfilService'
import locationsService from '../../services/locationsService'
import { useAudit } from '../../hooks/useAudit'

export default function PerfilPage() {
  const audit = useAudit('Perfil')
  
  // Estado del perfil
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  
  // Datos de ubicación
  const [departamentos, setDepartamentos] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [loadingMunicipios, setLoadingMunicipios] = useState(false)
  
  // Datos de ubicación para lugar de expedición
  const [municipiosExpedicion, setMunicipiosExpedicion] = useState([])
  const [loadingMunicipiosExpedicion, setLoadingMunicipiosExpedicion] = useState(false)
  
  // Configuración de notificaciones
  const [configNotif, setConfigNotif] = useState(null)
  
  // Formularios de edición
  const [formData, setFormData] = useState({
    // Información personal
    fecha_nacimiento: '',
    genero: '',
    estado_civil: '',
    nacionalidad: '',
    
    // Contacto
    telefono: '',
    telefono_emergencia: '',
    contacto_emergencia: '',
    
    // Dirección
    direccion_residencia: '',
    ciudad_residencia: '',
    departamento_residencia: '',
    codigo_postal: '',
    
    // Información médica
    tipo_sangre: '',
    alergias: '',
    medicamentos: '',
    condiciones_medicas: '',
    
    // Información profesional
    nivel_educacion: '',
    profesion: '',
    habilidades: '',
    experiencia_laboral: '',
    certificaciones: '',
    
    // Información bancaria
    banco: '',
    numero_cuenta: '',
    tipo_cuenta: '',
    
    // Identificación
    numero_cedula: '',
    departamento_expedicion_cedula: '',
    lugar_expedicion_cedula: '',
    
    // Preferencias
    tema_preferido: 'claro',
    idioma_preferido: 'es',
    zona_horaria: 'America/Bogota',
    privacidad_publica: false,
  })
  
  // Modal de cambio de contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  // Foto de perfil
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    const inicializar = async () => {
      await cargarDepartamentos() // Cargar departamentos PRIMERO
      await cargarPerfil() // Luego cargar perfil (que depende de departamentos)
      cargarConfigNotificaciones() // Esto puede ir en paralelo
    }
    inicializar()
  }, [])
  
  useEffect(() => {
    // Cargar municipios cuando cambia el departamento seleccionado
    if (formData.departamento_residencia) {
      cargarMunicipiosPorDepartamento(formData.departamento_residencia)
    }
  }, [formData.departamento_residencia])
  
  useEffect(() => {
    // Cargar municipios de expedición cuando cambia el departamento de expedición
    if (formData.departamento_expedicion_cedula) {
      cargarMunicipiosExpedicionPorDepartamento(formData.departamento_expedicion_cedula)
    }
  }, [formData.departamento_expedicion_cedula])

  const cargarDepartamentos = async () => {
    try {
      const data = await locationsService.getAllDepartamentos()
      setDepartamentos(data)
    } catch (error) {
      console.error('Error cargando departamentos:', error)
    }
  }

  const cargarMunicipiosPorDepartamento = async (departamentoNombre) => {
    try {
      setLoadingMunicipios(true)
      console.log('Buscando municipios para departamento:', departamentoNombre)
      console.log('Departamentos disponibles:', departamentos.length)
      // Buscar el ID del departamento por nombre
      const depto = departamentos.find(d => d.nombre === departamentoNombre)
      console.log('Departamento encontrado:', depto)
      if (depto) {
        const data = await locationsService.getMunicipiosByDepartamento(depto.id)
        console.log('Municipios cargados:', data.length)
        setMunicipios(data)
      } else {
        console.warn('No se encontró el departamento:', departamentoNombre)
      }
    } catch (error) {
      console.error('Error cargando municipios:', error)
      setMunicipios([])
    } finally {
      setLoadingMunicipios(false)
    }
  }

  const cargarMunicipiosExpedicionPorDepartamento = async (departamentoNombre) => {
    try {
      setLoadingMunicipiosExpedicion(true)
      console.log('Buscando municipios expedición para departamento:', departamentoNombre)
      // Buscar el ID del departamento por nombre
      const depto = departamentos.find(d => d.nombre === departamentoNombre)
      console.log('Departamento expedición encontrado:', depto)
      if (depto) {
        const data = await locationsService.getMunicipiosByDepartamento(depto.id)
        console.log('Municipios expedición cargados:', data.length)
        setMunicipiosExpedicion(data)
      } else {
        console.warn('No se encontró el departamento de expedición:', departamentoNombre)
      }
    } catch (error) {
      console.error('Error cargando municipios de expedición:', error)
      setMunicipiosExpedicion([])
    } finally {
      setLoadingMunicipiosExpedicion(false)
    }
  }

  const cargarPerfil = async () => {
    try {
      setLoading(true)
      const data = await getMiPerfil()
      setPerfil(data)
      
      console.log('Perfil cargado:', data)
      console.log('Departamento residencia:', data.departamento_residencia)
      console.log('Ciudad residencia:', data.ciudad_residencia)
      console.log('Departamento expedición:', data.departamento_expedicion_cedula)
      console.log('Lugar expedición:', data.lugar_expedicion_cedula)
      
      // Cargar municipios ANTES de llenar el formulario si ya hay departamentos seleccionados
      if (data.departamento_residencia) {
        await cargarMunicipiosPorDepartamento(data.departamento_residencia)
      }
      if (data.departamento_expedicion_cedula) {
        await cargarMunicipiosExpedicionPorDepartamento(data.departamento_expedicion_cedula)
      }
      
      // Llenar formulario con datos actuales DESPUÉS de cargar municipios
      setFormData({
        fecha_nacimiento: data.fecha_nacimiento || '',
        genero: data.genero || '',
        estado_civil: data.estado_civil || '',
        nacionalidad: data.nacionalidad || '',
        telefono: data.telefono || '',
        telefono_emergencia: data.telefono_emergencia || '',
        contacto_emergencia: data.contacto_emergencia || '',
        direccion_residencia: data.direccion_residencia || '',
        ciudad_residencia: data.ciudad_residencia || '',
        departamento_residencia: data.departamento_residencia || '',
        codigo_postal: data.codigo_postal || '',
        tipo_sangre: data.tipo_sangre || '',
        alergias: data.alergias || '',
        medicamentos: data.medicamentos || '',
        condiciones_medicas: data.condiciones_medicas || '',
        nivel_educacion: data.nivel_educacion || '',
        profesion: data.profesion || '',
        habilidades: data.habilidades || '',
        experiencia_laboral: data.experiencia_laboral || '',
        certificaciones: data.certificaciones || '',
        banco: data.banco || '',
        numero_cuenta: data.numero_cuenta || '',
        tipo_cuenta: data.tipo_cuenta || '',
        numero_cedula: data.numero_cedula || '',
        departamento_expedicion_cedula: data.departamento_expedicion_cedula || '',
        lugar_expedicion_cedula: data.lugar_expedicion_cedula || '',
        tema_preferido: data.tema_preferido || 'claro',
        idioma_preferido: data.idioma_preferido || 'es',
        zona_horaria: data.zona_horaria || 'America/Bogota',
        privacidad_publica: data.privacidad_publica || false,
      })
      
      audit.custom('ver_perfil', { perfil_id: data.id })
    } catch (error) {
      console.error('Error cargando perfil:', error)
      toast.error('Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }

  const cargarConfigNotificaciones = async () => {
    try {
      const response = await getConfigNotificaciones()
      if (response.results && response.results.length > 0) {
        setConfigNotif(response.results[0])
      }
    } catch (error) {
      console.error('Error cargando configuración de notificaciones:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const dataToUpdate = {}
      
      // Solo enviar campos que han cambiado
      Object.keys(formData).forEach(key => {
        if (formData[key] !== perfil[key]) {
          dataToUpdate[key] = formData[key]
        }
      })
      
      if (Object.keys(dataToUpdate).length === 0) {
        toast.info('No hay cambios para guardar')
        setEditMode(false)
        return
      }
      
      const updated = await actualizarMiPerfilParcial(dataToUpdate)
      setPerfil(updated)
      setEditMode(false)
      toast.success('Perfil actualizado correctamente')
      
      audit.button('actualizar_perfil', perfil.id)
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      toast.error('Error al actualizar el perfil')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('La imagen no debe superar 5MB')
        return
      }
      
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile) return
    
    try {
      const updated = await subirFotoPerfil(selectedFile)
      setPerfil(updated)
      setSelectedFile(null)
      setPreviewUrl(null)
      toast.success('Foto actualizada correctamente')
      
      audit.button('actualizar_foto_perfil', { perfil_id: perfil.id })
    } catch (error) {
      console.error('Error subiendo foto:', error)
      toast.error('Error al actualizar la foto')
    }
  }
  
  const handleCancelEdit = async () => {
    // Restaurar datos originales
    setFormData({
      fecha_nacimiento: perfil.fecha_nacimiento || '',
      genero: perfil.genero || '',
      estado_civil: perfil.estado_civil || '',
      nacionalidad: perfil.nacionalidad || '',
      telefono: perfil.telefono || '',
      telefono_emergencia: perfil.telefono_emergencia || '',
      contacto_emergencia: perfil.contacto_emergencia || '',
      direccion_residencia: perfil.direccion_residencia || '',
      ciudad_residencia: perfil.ciudad_residencia || '',
      departamento_residencia: perfil.departamento_residencia || '',
      codigo_postal: perfil.codigo_postal || '',
      tipo_sangre: perfil.tipo_sangre || '',
      alergias: perfil.alergias || '',
      medicamentos: perfil.medicamentos || '',
      condiciones_medicas: perfil.condiciones_medicas || '',
      nivel_educacion: perfil.nivel_educacion || '',
      profesion: perfil.profesion || '',
      habilidades: perfil.habilidades || '',
      experiencia_laboral: perfil.experiencia_laboral || '',
      certificaciones: perfil.certificaciones || '',
      banco: perfil.banco || '',
      numero_cuenta: perfil.numero_cuenta || '',
      tipo_cuenta: perfil.tipo_cuenta || '',
      numero_cedula: perfil.numero_cedula || '',
      departamento_expedicion_cedula: perfil.departamento_expedicion_cedula || '',
      lugar_expedicion_cedula: perfil.lugar_expedicion_cedula || '',
      tema_preferido: perfil.tema_preferido || 'claro',
      idioma_preferido: perfil.idioma_preferido || 'es',
      zona_horaria: perfil.zona_horaria || 'America/Bogota',
      privacidad_publica: perfil.privacidad_publica || false,
    })
    
    // Recargar municipios para mantener opciones disponibles
    if (perfil.departamento_residencia) {
      await cargarMunicipiosPorDepartamento(perfil.departamento_residencia)
    }
    if (perfil.departamento_expedicion_cedula) {
      await cargarMunicipiosExpedicionPorDepartamento(perfil.departamento_expedicion_cedula)
    }
    
    setEditMode(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    
    if (passwordData.new_password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    
    try {
      await cambiarContrasena({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      })
      
      toast.success('Contraseña cambiada correctamente')
      setShowPasswordModal(false)
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      })
      
      audit.formSubmit('cambiar_contrasena', { perfil_id: perfil.id })
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      toast.error(error.response?.data?.message || 'Error al cambiar la contraseña')
    }
  }

  const handleNotifChange = async (field, value) => {
    if (!configNotif) return
    
    try {
      const updated = await actualizarConfigNotificacionesParcial(configNotif.id, {
        [field]: value
      })
      setConfigNotif(updated)
      toast.success('Configuración actualizada')
      
      audit.custom('actualizar_notificaciones', { config_id: configNotif.id })
    } catch (error) {
      console.error('Error actualizando notificaciones:', error)
      toast.error('Error al actualizar configuración')
    }
  }

  const tabs = [
    { id: 'personal', name: 'Información Personal', icon: UserCircleIcon },
    { id: 'contacto', name: 'Contacto', icon: PhoneIcon },
    { id: 'ubicacion', name: 'Ubicación', icon: MapPinIcon },
    { id: 'medica', name: 'Información Médica', icon: HeartIcon },
    { id: 'profesional', name: 'Información Profesional', icon: AcademicCapIcon },
    { id: 'bancaria', name: 'Información Bancaria', icon: BanknotesIcon },
    { id: 'seguridad', name: 'Seguridad', icon: ShieldCheckIcon },
    { id: 'notificaciones', name: 'Notificaciones', icon: BellIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No se pudo cargar el perfil</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con foto de perfil */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Foto de perfil */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30">
                {previewUrl || perfil.foto ? (
                  <img
                    src={previewUrl || (perfil.foto ? `http://localhost:8000${perfil.foto}` : '')}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircleIcon className="w-20 h-20 text-white/70" />
                  </div>
                )}
              </div>
              
              <label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 bg-white text-indigo-600 rounded-full p-2 cursor-pointer hover:bg-indigo-50 transition-colors shadow-lg"
              >
                <CameraIcon className="w-5 h-5" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {/* Información del usuario */}
            <div>
              <h1 className="text-3xl font-bold">{perfil.nombre_completo}</h1>
              <p className="text-white/80 mt-1">{perfil.usuario?.email}</p>
              <div className="flex items-center gap-4 mt-3">
                {perfil.profesion && (
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    {perfil.profesion}
                  </span>
                )}
                {perfil.edad && (
                  <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    {perfil.edad} años
                  </span>
                )}
                {perfil.perfil_completado ? (
                  <span className="bg-green-500/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <CheckIcon className="w-4 h-4" />
                    Perfil Completado
                  </span>
                ) : (
                  <span className="bg-yellow-500/30 backdrop-blur-sm px-3 py-1 rounded-full text-sm">
                    Perfil Incompleto
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex gap-2">
            {selectedFile && (
              <button
                onClick={handleUploadPhoto}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Guardar Foto
              </button>
            )}
            
            {!editMode ? (
              <button
                onClick={() => {
                  setEditMode(true)
                  audit.button('activar_modo_edicion', { perfil_id: perfil.id })
                }}
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  onClick={handleSubmit}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                >
                  <CheckIcon className="w-5 h-5" />
                  Guardar
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-1 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    audit.tab(tab.nombre)
                  }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenido de las tabs */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Tab: Información Personal */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Género
                  </label>
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero_no_decir">Prefiero no decir</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado Civil
                  </label>
                  <select
                    name="estado_civil"
                    value={formData.estado_civil}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar</option>
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="divorciado">Divorciado/a</option>
                    <option value="viudo">Viudo/a</option>
                    <option value="union_libre">Unión libre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidad
                  </label>
                  <input
                    type="text"
                    name="nacionalidad"
                    value={formData.nacionalidad}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: Colombiana"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Cédula
                  </label>
                  <input
                    type="text"
                    name="numero_cedula"
                    value={formData.numero_cedula}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: 1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento de Expedición
                  </label>
                  <select
                    name="departamento_expedicion_cedula"
                    value={formData.departamento_expedicion_cedula}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar Departamento</option>
                    {departamentos.map(dept => (
                      <option key={dept.id} value={dept.nombre}>
                        {dept.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lugar de Expedición (Municipio)
                  </label>
                  <select
                    name="lugar_expedicion_cedula"
                    value={formData.lugar_expedicion_cedula}
                    onChange={handleInputChange}
                    disabled={!editMode || !formData.departamento_expedicion_cedula || loadingMunicipiosExpedicion}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">
                      {loadingMunicipiosExpedicion 
                        ? 'Cargando municipios...' 
                        : formData.departamento_expedicion_cedula 
                          ? 'Seleccionar Municipio'
                          : 'Primero selecciona un departamento'}
                    </option>
                    {municipiosExpedicion.map(mun => (
                      <option key={mun.id} value={mun.nombre}>
                        {mun.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Contacto */}
            {activeTab === 'contacto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono Principal
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="+57 300 123 4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono de Emergencia
                  </label>
                  <input
                    type="tel"
                    name="telefono_emergencia"
                    value={formData.telefono_emergencia}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="+57 300 123 4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    name="contacto_emergencia"
                    value={formData.contacto_emergencia}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: María Pérez (Madre)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Tab: Ubicación */}
            {activeTab === 'ubicacion' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección de Residencia
                  </label>
                  <textarea
                    name="direccion_residencia"
                    value={formData.direccion_residencia}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Ej: Calle 123 #45-67, Apto 101"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento
                  </label>
                  <select
                    name="departamento_residencia"
                    value={formData.departamento_residencia}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar Departamento</option>
                    {departamentos.map(dept => (
                      <option key={dept.id} value={dept.nombre}>
                        {dept.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad / Municipio
                  </label>
                  <select
                    name="ciudad_residencia"
                    value={formData.ciudad_residencia}
                    onChange={handleInputChange}
                    disabled={!editMode || !formData.departamento_residencia || loadingMunicipios}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">
                      {loadingMunicipios 
                        ? 'Cargando municipios...' 
                        : formData.departamento_residencia 
                          ? 'Seleccionar Municipio'
                          : 'Primero selecciona un departamento'}
                    </option>
                    {municipios.map(mun => (
                      <option key={mun.id} value={mun.nombre}>
                        {mun.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    name="codigo_postal"
                    value={formData.codigo_postal}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: 110111"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Tab: Información Médica */}
            {activeTab === 'medica' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Sangre
                  </label>
                  <select
                    name="tipo_sangre"
                    value={formData.tipo_sangre}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alergias
                  </label>
                  <textarea
                    name="alergias"
                    value={formData.alergias}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Describa cualquier alergia conocida"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicamentos
                  </label>
                  <textarea
                    name="medicamentos"
                    value={formData.medicamentos}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Medicamentos que toma regularmente"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condiciones Médicas
                  </label>
                  <textarea
                    name="condiciones_medicas"
                    value={formData.condiciones_medicas}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Condiciones médicas relevantes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Tab: Información Profesional */}
            {activeTab === 'profesional' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de Educación
                  </label>
                  <select
                    name="nivel_educacion"
                    value={formData.nivel_educacion}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar</option>
                    <option value="primaria">Primaria</option>
                    <option value="secundaria">Secundaria</option>
                    <option value="tecnico">Técnico</option>
                    <option value="tecnologo">Tecnólogo</option>
                    <option value="universitario">Universitario</option>
                    <option value="especializacion">Especialización</option>
                    <option value="maestria">Maestría</option>
                    <option value="doctorado">Doctorado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profesión
                  </label>
                  <input
                    type="text"
                    name="profesion"
                    value={formData.profesion}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: Ingeniero de Software"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Habilidades
                  </label>
                  <textarea
                    name="habilidades"
                    value={formData.habilidades}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Describa sus habilidades principales"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experiencia Laboral
                  </label>
                  <textarea
                    name="experiencia_laboral"
                    value={formData.experiencia_laboral}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={4}
                    placeholder="Resumen de experiencia laboral relevante"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Certificaciones
                  </label>
                  <textarea
                    name="certificaciones"
                    value={formData.certificaciones}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    rows={3}
                    placeholder="Certificaciones profesionales obtenidas"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>
              </div>
            )}

            {/* Tab: Información Bancaria */}
            {activeTab === 'bancaria' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banco
                  </label>
                  <input
                    type="text"
                    name="banco"
                    value={formData.banco}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: Bancolombia"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cuenta
                  </label>
                  <select
                    name="tipo_cuenta"
                    value={formData.tipo_cuenta}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  >
                    <option value="">Seleccionar</option>
                    <option value="ahorros">Ahorros</option>
                    <option value="corriente">Corriente</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Cuenta
                  </label>
                  <input
                    type="text"
                    name="numero_cuenta"
                    value={formData.numero_cuenta}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="Ej: 1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  />
                </div>

                <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ShieldCheckIcon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Información Sensible</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Tu información bancaria está protegida y solo será utilizada para procesos de pago.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Seguridad */}
            {activeTab === 'seguridad' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <KeyIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Cambiar Contraseña
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Mantén tu cuenta segura actualizando tu contraseña regularmente.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordModal(true)
                          audit.modalOpen('cambiar_contrasena', { perfil_id: perfil.id })
                        }}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Cambiar Contraseña
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <UserCircleIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Privacidad del Perfil
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Controla si otros usuarios pueden ver tu información pública.
                      </p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="privacidad_publica"
                          checked={formData.privacidad_publica}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        />
                        <span className="text-sm text-gray-700">
                          Permitir que mi perfil sea visible públicamente
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <DocumentTextIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Preferencias de Sistema
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tema
                          </label>
                          <select
                            name="tema_preferido"
                            value={formData.tema_preferido}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                          >
                            <option value="claro">Claro</option>
                            <option value="oscuro">Oscuro</option>
                            <option value="automatico">Automático</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Idioma
                          </label>
                          <select
                            name="idioma_preferido"
                            value={formData.idioma_preferido}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                          >
                            <option value="es">Español</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Notificaciones */}
            {activeTab === 'notificaciones' && configNotif && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BellIcon className="w-6 h-6 text-indigo-600" />
                    Tipos de Notificaciones
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700">Notificaciones de Préstamos</span>
                      <input
                        type="checkbox"
                        checked={configNotif.notif_prestamos}
                        onChange={(e) => handleNotifChange('notif_prestamos', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700">Notificaciones de Nómina</span>
                      <input
                        type="checkbox"
                        checked={configNotif.notif_nomina}
                        onChange={(e) => handleNotifChange('notif_nomina', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700">Notificaciones de Documentos</span>
                      <input
                        type="checkbox"
                        checked={configNotif.notif_documentos}
                        onChange={(e) => handleNotifChange('notif_documentos', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-sm text-gray-700">Notificaciones del Sistema</span>
                      <input
                        type="checkbox"
                        checked={configNotif.notif_sistema}
                        onChange={(e) => handleNotifChange('notif_sistema', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Canales de Notificación
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">Correo Electrónico</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={configNotif.via_email}
                        onChange={(e) => handleNotifChange('via_email', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">SMS</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={configNotif.via_sms}
                        onChange={(e) => handleNotifChange('via_sms', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <BellIcon className="w-5 h-5 text-gray-500" />
                        <span className="text-sm text-gray-700">En la Plataforma</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={configNotif.via_plataforma}
                        onChange={(e) => handleNotifChange('via_plataforma', e.target.checked)}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
                    Horario de Notificaciones
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora de Inicio
                      </label>
                      <input
                        type="time"
                        value={configNotif.horario_inicio}
                        onChange={(e) => handleNotifChange('horario_inicio', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hora de Fin
                      </label>
                      <input
                        type="time"
                        value={configNotif.horario_fin}
                        onChange={(e) => handleNotifChange('horario_fin', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Solo recibirás notificaciones durante este horario
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <KeyIcon className="w-8 h-8" />
                  <h2 className="text-2xl font-bold">Cambiar Contraseña</h2>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, old_password: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  <strong>Importante:</strong> Al cambiar tu contraseña, se cerrarán todas las sesiones activas en otros dispositivos.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Cambiar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
