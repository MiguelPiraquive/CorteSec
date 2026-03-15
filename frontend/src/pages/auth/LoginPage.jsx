import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Shield,
  Users,
  BarChart3,
  FileCheck,
  Zap,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { setTenant } = useTenant()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Email invalido')
      .required('El email es requerido'),
    password: Yup.string()
      .required('La contrasena es requerida')
      .min(6, 'La contrasena debe tener al menos 6 caracteres'),
  })

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)

      try {
        const response = await login(values.email, values.password)

        if (response.success) {
          if (response.organization) {
            setTenant(response.organization.codigo, response.organization.slug || response.organization.codigo)
          }

          toast.success(response.message || 'Bienvenido!')
          navigate('/dashboard')
        } else {
          toast.error(response.message || 'Error al iniciar sesion')
        }
      } catch (error) {
        console.error('Login error:', error)

        if (error.locked_out) {
          toast.error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${Math.ceil(error.retry_after / 60)} minutos.`)
        } else if (error.account_disabled) {
          toast.error('Tu cuenta esta deshabilitada. Contacta al administrador.')
        } else if (error.message) {
          toast.error(error.message)
        } else if (error.errors) {
          Object.keys(error.errors).forEach((key) => {
            const errorMessages = error.errors[key]
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(`${key}: ${msg}`))
            } else {
              toast.error(`${key}: ${errorMessages}`)
            }
          })
        } else {
          toast.error('Error al iniciar sesion. Verifica tus credenciales.')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  const features = [
    {
      icon: Users,
      title: 'Gestion de personal',
      description: 'Empleados, contratos y cargos en un solo lugar.',
    },
    {
      icon: BarChart3,
      title: 'Nomina automatizada',
      description: 'Calculo preciso con parametros legales actualizados.',
    },
    {
      icon: FileCheck,
      title: 'Contabilidad integrada',
      description: 'Movimientos contables generados automaticamente.',
    },
    {
      icon: Zap,
      title: 'Control de acceso granular',
      description: 'Roles y permisos configurables por organizacion.',
    },
  ]

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Panel Izquierdo ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-gradient-to-br from-primary-700 via-primary-600 to-blue-500 relative overflow-hidden">
        {/* Formas decorativas de fondo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-16 right-8 w-80 h-80 bg-blue-300/[0.08] rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary-300/[0.06] rounded-full blur-2xl" />

        {/* Patron de puntos sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Contenido del panel */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 animate-in">
            <div className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">CorteSec</span>
          </div>

          {/* Texto principal y features */}
          <div className="space-y-10 animate-in">
            <div className="space-y-4">
              <h2 className="text-3xl xl:text-[2.5rem] font-bold text-white leading-tight">
                La plataforma que{' '}
                <span className="text-blue-200">simplifica</span>{' '}
                la gestion de tu empresa.
              </h2>
              <p className="text-blue-100/70 text-base leading-relaxed max-w-md">
                Centraliza la administracion de nomina, empleados y contabilidad con herramientas seguras y eficientes.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300 group-hover:bg-white/15">
                    <feature.icon className="w-[18px] h-[18px] text-blue-200" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm leading-snug">
                      {feature.title}
                    </p>
                    <p className="text-blue-200/60 text-sm leading-relaxed mt-0.5">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer del panel */}
          <p className="text-blue-200/30 text-xs animate-in">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* ── Panel Derecho (Formulario) ── */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 sm:p-10 relative overflow-y-auto">
        {/* Detalles de fondo suaves */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 animate-in">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md border border-primary-400/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CorteSec</span>
          </div>

          {/* Encabezado */}
          <div className="mb-8 animate-slide-in">
            <h2 className="text-2xl font-bold text-gray-900">
              Bienvenido de nuevo
            </h2>
            <p className="text-gray-500 mt-1.5 text-[15px]">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 animate-scale-in">
            <form onSubmit={formik.handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electronico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@ejemplo.com"
                    className={`input-field pl-11 ${
                      formik.touched.email && formik.errors.email ? 'input-error' : ''
                    }`}
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contrasena
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tu contrasena"
                    className={`input-field pl-11 pr-11 ${
                      formik.touched.password && formik.errors.password ? 'input-error' : ''
                    }`}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.password}
                  </p>
                )}
              </div>

              {/* Recordarme y Olvidaste */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded transition-colors duration-200"
                    checked={formik.values.rememberMe}
                    onChange={formik.handleChange}
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-600">Recordarme</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors duration-200"
                >
                  Olvidaste tu contrasena?
                </Link>
              </div>

              {/* Boton */}
              <button
                type="submit"
                disabled={isLoading || !formik.isValid}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    Iniciando sesion...
                  </>
                ) : (
                  <>
                    <LogIn className="w-[18px] h-[18px]" />
                    Iniciar Sesion
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Link de registro */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200"
              >
                Crea tu organizacion
              </Link>
            </p>
          </div>

          {/* Footer mobile */}
          <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
