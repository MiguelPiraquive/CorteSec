import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Settings, Save, Upload, CheckCircle, AlertCircle, TestTube } from 'lucide-react'
import { Button, Card, CardHeader, CardBody, FormField, SelectField, Badge } from '../../components/payroll'
import { configuracionAPI } from '../../services/payrollService'

const ConfiguracionNominaElectronicaPage = () => {
  const [loading, setLoading] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [configuracion, setConfiguracion] = useState(null)
  const [certificadoFile, setCertificadoFile] = useState(null)

  const [formData, setFormData] = useState({
    // Configuración general
    activa: true,
    ambiente: 'produccion',
    tipo_ambiente_id: 1,
    
    // Datos del empleador
    razon_social: '',
    nombre_comercial: '',
    nit: '',
    dv: '',
    tipo_regimen: '48',
    responsabilidades_tributarias: [],
    codigo_actividad_economica: '',
    
    // Ubicación geográfica
    pais_codigo: 'CO',
    departamento_codigo: '',
    municipio_codigo: '',
    direccion: '',
    telefono: '',
    email: '',
    
    // Numeración autorizada
    prefijo: '',
    resolucion_numero: '',
    resolucion_fecha: '',
    rango_inicio: '',
    rango_fin: '',
    fecha_vigencia_desde: '',
    fecha_vigencia_hasta: '',
    
    // Proveedor tecnológico
    proveedor_razon_social: '',
    proveedor_nit: '',
    proveedor_software_id: '',
    
    // Parámetros técnicos
    identificador_software: '',
    clave_tecnica: '',
    test_set_id: '',
    
    // Certificado digital
    certificado_password: '',
    
    // URLs servicios DIAN
    url_webservice: '',
    url_validacion_previa: '',
    url_recepcion: '',
    url_consulta: '',
    
    // Configuración de envío
    envio_automatico: true,
    notificar_empleado: true
  })

  useEffect(() => {
    loadConfiguracionActiva()
  }, [])

  const loadConfiguracionActiva = async () => {
    setLoading(true)
    try {
      const response = await configuracionAPI.activa()
      if (response) {
        const data = response.data || response
        setConfiguracion(data)
        setFormData({
          // Configuración general
          activa: data.activa !== false,
          ambiente: data.ambiente || 'produccion',
          tipo_ambiente_id: data.tipo_ambiente_id || 1,
          
          // Datos del empleador
          razon_social: data.razon_social || '',
          nombre_comercial: data.nombre_comercial || '',
          nit: data.nit || '',
          dv: data.dv || '',
          tipo_regimen: data.tipo_regimen || '48',
          responsabilidades_tributarias: data.responsabilidades_tributarias || [],
          codigo_actividad_economica: data.codigo_actividad_economica || '',
          
          // Ubicación geográfica
          pais_codigo: data.pais_codigo || 'CO',
          departamento_codigo: data.departamento_codigo || '',
          municipio_codigo: data.municipio_codigo || '',
          direccion: data.direccion || '',
          telefono: data.telefono || '',
          email: data.email || '',
          
          // Numeración autorizada
          prefijo: data.prefijo || '',
          resolucion_numero: data.resolucion_numero || '',
          resolucion_fecha: data.resolucion_fecha || '',
          rango_inicio: data.rango_inicio || '',
          rango_fin: data.rango_fin || '',
          fecha_vigencia_desde: data.fecha_vigencia_desde || '',
          fecha_vigencia_hasta: data.fecha_vigencia_hasta || '',
          
          // Proveedor tecnológico
          proveedor_razon_social: data.proveedor_razon_social || '',
          proveedor_nit: data.proveedor_nit || '',
          proveedor_software_id: data.proveedor_software_id || '',
          
          // Parámetros técnicos
          identificador_software: data.identificador_software || '',
          clave_tecnica: data.clave_tecnica || '',
          test_set_id: data.test_set_id || '',
          
          // Certificado digital
          certificado_password: '',
          
          // URLs servicios DIAN
          url_webservice: data.url_webservice || '',
          url_validacion_previa: data.url_validacion_previa || '',
          url_recepcion: data.url_recepcion || '',
          url_consulta: data.url_consulta || '',
          
          // Configuración de envío
          envio_automatico: data.envio_automatico !== false,
          notificar_empleado: data.notificar_empleado !== false
        })
      }
    } catch (error) {
      console.error('No hay configuración activa:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCertificadoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El certificado no debe superar 5MB')
        return
      }
      setCertificadoFile(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Limpiar campos vacíos para evitar errores de validación
      const cleanData = {}
      Object.keys(formData).forEach(key => {
        const value = formData[key]
        // Solo incluir campos con valores válidos
        if (value !== '' && value !== null && value !== undefined) {
          cleanData[key] = value
        }
      })

      let result
      if (configuracion) {
        result = await configuracionAPI.update(configuracion.id, cleanData)
        toast.success('Configuración actualizada correctamente')
      } else {
        result = await configuracionAPI.create(cleanData)
        toast.success('Configuración creada correctamente')
      }
      const configData = result.data || result
      setConfiguracion(configData)
      // Actualizar formData con la configuración guardada
      if (configData.id) {
        loadConfiguracionActiva()
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 
                       error.response?.data?.error ||
                       JSON.stringify(error.response?.data) ||
                       'Error al guardar configuración'
      toast.error(errorMsg)
      console.error('Error completo:', error.response?.data)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadCertificado = async () => {
    if (!certificadoFile) {
      toast.warning('Seleccione un archivo de certificado')
      return
    }

    if (!configuracion) {
      toast.warning('Primero debe crear la configuración')
      return
    }

    setLoading(true)
    try {
      await configuracionAPI.uploadCertificado(configuracion.id, certificadoFile, formData.certificado_password)
      toast.success('Certificado subido correctamente')
      setCertificadoFile(null)
      loadConfiguracionActiva()
    } catch (error) {
      toast.error('Error al subir certificado')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!configuracion) {
      toast.warning('Primero debe crear la configuración')
      return
    }

    setTestingConnection(true)
    try {
      const result = await configuracionAPI.probarConexion(configuracion.id)
      if (result.success) {
        toast.success(`✅ Conexión exitosa: ${result.message}`)
      } else {
        toast.error(`❌ Error de conexión: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error al probar conexión con la DIAN')
      console.error(error)
    } finally {
      setTestingConnection(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración Nómina Electrónica</h1>
          <p className="text-gray-600 mt-1">Configuración para integración con la DIAN</p>
        </div>
        {configuracion && (
          <Badge variant={configuracion.certificado ? 'success' : 'warning'}>
            {configuracion.certificado ? '✓ Certificado configurado' : '⚠ Sin certificado'}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================
            INFORMACIÓN DEL EMPLEADOR
        ======================================== */}
        <Card>
          <CardHeader title="📋 Información del Empleador" subtitle="Datos de la empresa según registro DIAN" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <FormField
                label="Razón Social"
                name="razon_social"
                value={formData.razon_social}
                onChange={handleInputChange}
                required
                helper="Razón social registrada en RUT"
              />

              <FormField
                label="Nombre Comercial"
                name="nombre_comercial"
                value={formData.nombre_comercial}
                onChange={handleInputChange}
                helper="Si es diferente a la razón social"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="NIT"
                  name="nit"
                  value={formData.nit}
                  onChange={handleInputChange}
                  required
                  helper="Sin puntos ni guiones"
                />
                <FormField
                  label="Dígito Verificación"
                  name="dv"
                  value={formData.dv}
                  onChange={handleInputChange}
                  required
                  maxLength="1"
                />
                <SelectField
                  label="Tipo de Régimen"
                  name="tipo_regimen"
                  value={formData.tipo_regimen}
                  onChange={handleInputChange}
                  options={[
                    { value: '48', label: 'Responsable de IVA' },
                    { value: '49', label: 'No responsable de IVA' }
                  ]}
                  required
                />
              </div>

              <FormField
                label="Código Actividad Económica (CIIU)"
                name="codigo_actividad_economica"
                value={formData.codigo_actividad_economica}
                onChange={handleInputChange}
                helper="Código CIIU de la actividad principal"
              />
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            UBICACIÓN GEOGRÁFICA (DANE/DIVIPOLA)
        ======================================== */}
        <Card>
          <CardHeader title="📍 Ubicación Geográfica" subtitle="Códigos DANE/DIVIPOLA oficiales" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <FormField
                label="Dirección"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="Código País"
                  name="pais_codigo"
                  value={formData.pais_codigo}
                  onChange={handleInputChange}
                  required
                  helper="ISO 3166-1 (CO=Colombia)"
                  maxLength="2"
                />
                <FormField
                  label="Código Departamento DANE"
                  name="departamento_codigo"
                  value={formData.departamento_codigo}
                  onChange={handleInputChange}
                  required
                  helper="2 dígitos (ej: 11=Bogotá, 05=Antioquia)"
                  maxLength="2"
                />
                <FormField
                  label="Código Municipio DANE"
                  name="municipio_codigo"
                  value={formData.municipio_codigo}
                  onChange={handleInputChange}
                  required
                  helper="5 dígitos (ej: 11001=Bogotá)"
                  maxLength="5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Teléfono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  required
                />
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            NUMERACIÓN AUTORIZADA DIAN
        ======================================== */}
        <Card>
          <CardHeader title="🔢 Numeración Autorizada DIAN" subtitle="Resolución de autorización de numeración" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Prefijo"
                  name="prefijo"
                  value={formData.prefijo}
                  onChange={handleInputChange}
                  helper="Prefijo de la numeración (ej: NE, NOM)"
                />
                <FormField
                  label="Número de Resolución"
                  name="resolucion_numero"
                  value={formData.resolucion_numero}
                  onChange={handleInputChange}
                  helper="Número de resolución DIAN"
                />
              </div>

              <FormField
                label="Fecha de Resolución"
                name="resolucion_fecha"
                type="date"
                value={formData.resolucion_fecha}
                onChange={handleInputChange}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Rango Inicio"
                  name="rango_inicio"
                  type="number"
                  value={formData.rango_inicio}
                  onChange={handleInputChange}
                  helper="Número inicial autorizado"
                />
                <FormField
                  label="Rango Fin"
                  name="rango_fin"
                  type="number"
                  value={formData.rango_fin}
                  onChange={handleInputChange}
                  helper="Número final autorizado"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Vigencia Desde"
                  name="fecha_vigencia_desde"
                  type="date"
                  value={formData.fecha_vigencia_desde}
                  onChange={handleInputChange}
                />
                <FormField
                  label="Vigencia Hasta"
                  name="fecha_vigencia_hasta"
                  type="date"
                  value={formData.fecha_vigencia_hasta}
                  onChange={handleInputChange}
                />
              </div>

              {configuracion && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Consecutivo actual:</span> {configuracion.consecutivo_actual || 1}
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            PROVEEDOR TECNOLÓGICO
        ======================================== */}
        <Card>
          <CardHeader title="🏢 Proveedor Tecnológico" subtitle="Datos del proveedor del software de nómina electrónica" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <FormField
                label="Razón Social del Proveedor"
                name="proveedor_razon_social"
                value={formData.proveedor_razon_social}
                onChange={handleInputChange}
                helper="Nombre de la empresa proveedora del software"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="NIT del Proveedor"
                  name="proveedor_nit"
                  value={formData.proveedor_nit}
                  onChange={handleInputChange}
                  helper="NIT del proveedor tecnológico"
                />
                <FormField
                  label="Software ID del Proveedor"
                  name="proveedor_software_id"
                  value={formData.proveedor_software_id}
                  onChange={handleInputChange}
                  helper="Identificador del software del proveedor"
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            CONFIGURACIÓN TÉCNICA DIAN
        ======================================== */}
        <Card>
          <CardHeader title="⚙️ Configuración Técnica" subtitle="Parámetros de integración con servicios DIAN" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Ambiente"
                  name="ambiente"
                  value={formData.ambiente}
                  onChange={handleInputChange}
                  options={[
                    { value: 'produccion', label: '🟢 Producción' },
                    { value: 'pruebas', label: '🟡 Habilitación (Pruebas)' }
                  ]}
                  required
                  helper="Producción: envíos reales. Habilitación: ambiente de pruebas"
                />
                <SelectField
                  label="Tipo Ambiente ID"
                  name="tipo_ambiente_id"
                  value={formData.tipo_ambiente_id}
                  onChange={handleInputChange}
                  options={[
                    { value: 1, label: '1 - Producción' },
                    { value: 2, label: '2 - Habilitación/Pruebas' }
                  ]}
                  required
                />
              </div>

              <FormField
                label="Test Set ID"
                name="test_set_id"
                value={formData.test_set_id}
                onChange={handleInputChange}
                helper="Identificador del set de pruebas (solo para habilitación)"
              />

              <FormField
                label="Identificador del Software (Software ID)"
                name="identificador_software"
                value={formData.identificador_software}
                onChange={handleInputChange}
                helper="ID del software del empleador registrado ante DIAN"
              />

              <FormField
                label="Clave Técnica (PIN)"
                name="clave_tecnica"
                type="password"
                value={formData.clave_tecnica}
                onChange={handleInputChange}
                helper="PIN de seguridad del software"
              />
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            URLs SERVICIOS WEB DIAN
        ======================================== */}
        <Card>
          <CardHeader title="🌐 URLs Servicios Web DIAN" subtitle="Endpoints de los servicios de nómina electrónica" />
          <CardBody padding="lg">
            <div className="space-y-4">
              <FormField
                label="URL WebService Principal"
                name="url_webservice"
                value={formData.url_webservice}
                onChange={handleInputChange}
                helper="URL base del servicio web DIAN"
              />

              <FormField
                label="URL Validación Previa"
                name="url_validacion_previa"
                value={formData.url_validacion_previa}
                onChange={handleInputChange}
                helper="Endpoint para validación previa del documento"
              />

              <FormField
                label="URL Recepción"
                name="url_recepcion"
                value={formData.url_recepcion}
                onChange={handleInputChange}
                helper="Endpoint para recepción de documentos"
              />

              <FormField
                label="URL Consulta"
                name="url_consulta"
                value={formData.url_consulta}
                onChange={handleInputChange}
                helper="Endpoint para consultar estado de documentos"
              />
            </div>
          </CardBody>
        </Card>

        {/* ========================================
            OPCIONES GENERALES
        ======================================== */}
        <Card>
          <CardHeader title="✅ Opciones Generales" subtitle="Configuración de comportamiento del sistema" />
          <CardBody padding="lg">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activa"
                  name="activa"
                  checked={formData.activa}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activa" className="text-sm font-medium text-gray-700">
                  ✓ Configuración activa
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="envio_automatico"
                  name="envio_automatico"
                  checked={formData.envio_automatico}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="envio_automatico" className="text-sm font-medium text-gray-700">
                  📤 Envío automático a la DIAN tras generación
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notificar_empleado"
                  name="notificar_empleado"
                  checked={formData.notificar_empleado}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notificar_empleado" className="text-sm font-medium text-gray-700">
                  📧 Notificar a empleados por correo electrónico
                </label>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Certificado Digital */}
        <Card>
          <CardHeader 
            title="Certificado Digital" 
            subtitle={configuracion?.certificado_fecha_vencimiento ? 
              `Vence: ${new Date(configuracion.certificado_fecha_vencimiento).toLocaleDateString('es-CO')}` : 
              'No hay certificado configurado'
            }
          />
          <CardBody padding="lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo de Certificado (.p12 / .pfx)
                </label>
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={handleCertificadoChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {certificadoFile && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {certificadoFile.name}
                  </p>
                )}
              </div>

              <FormField
                label="Contraseña del Certificado"
                name="certificado_password"
                type="password"
                value={formData.certificado_password}
                onChange={handleInputChange}
                helper="Contraseña del archivo .p12/.pfx"
              />

              <Button
                type="button"
                variant="secondary"
                icon={<Upload className="w-4 h-4" />}
                onClick={handleUploadCertificado}
                disabled={!certificadoFile || !formData.certificado_password}
              >
                Subir Certificado
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            icon={<TestTube className="w-4 h-4" />}
            onClick={handleTestConnection}
            loading={testingConnection}
            disabled={!configuracion}
          >
            Probar Conexión DIAN
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            loading={loading}
          >
            Guardar Configuración
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ConfiguracionNominaElectronicaPage
