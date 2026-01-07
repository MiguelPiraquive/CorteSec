import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { Lock, Mail, Building2, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { setTenant } = useTenant()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validationSchema = Yup.object({
    tenantCode: Yup.string()
      .required('El código de organización es requerido')
      .min(2, 'El código debe tener al menos 2 caracteres')
      .matches(/^[a-zA-Z0-9-_]+$/, 'El código solo puede contener letras, números, guiones y guiones bajos'),
    email: Yup.string()
      .email('Email inválido')
      .required('El email es requerido'),
    password: Yup.string()
      .required('La contraseña es requerida')
      .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  })

  const formik = useFormik({
    initialValues: {
      tenantCode: '',
      email: '',
      password: '',
      rememberMe: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      
      try {
        // Set tenant before login
        setTenant(values.tenantCode, values.tenantCode)
        
        const response = await login(values.email, values.password, values.tenantCode)
        
        if (response.success) {
          toast.success(response.message || '¡Bienvenido!')
          navigate('/dashboard')
        } else {
          toast.error(response.message || 'Error al iniciar sesión')
        }
      } catch (error) {
        console.error('Login error:', error)
        
        // Handle specific error cases
        if (error.locked_out) {
          toast.error(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${Math.ceil(error.retry_after / 60)} minutos.`)
        } else if (error.account_disabled) {
          toast.error('Tu cuenta está deshabilitada. Contacta al administrador.')
        } else if (error.message) {
          toast.error(error.message)
        } else if (error.errors) {
          // Display field-specific errors
          Object.keys(error.errors).forEach((key) => {
            const errorMessages = error.errors[key]
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(`${key}: ${msg}`))
            } else {
              toast.error(`${key}: ${errorMessages}`)
            }
          })
        } else {
          toast.error('Error al iniciar sesión. Verifica tus credenciales.')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CorteSec</h1>
          <p className="text-gray-600">Sistema de Gestión Empresarial</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Iniciar Sesión</h2>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Tenant Code Field */}
            <div>
              <label htmlFor="tenantCode" className="block text-sm font-medium text-gray-700 mb-2">
                Código de Organización *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="tenantCode"
                  name="tenantCode"
                  type="text"
                  placeholder="ej: cortesec, mi-empresa"
                  className={`input-field pl-10 ${
                    formik.touched.tenantCode && formik.errors.tenantCode ? 'input-error' : ''
                  }`}
                  value={formik.values.tenantCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isLoading}
                />
              </div>
              {formik.touched.tenantCode && formik.errors.tenantCode && (
                <p className="error-message flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {formik.errors.tenantCode}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Este código identifica tu organización en el sistema multitenant
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  className={`input-field pl-10 ${
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

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input-field pl-10 pr-10 ${
                    formik.touched.password && formik.errors.password ? 'input-error' : ''
                  }`}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  checked={formik.values.rememberMe}
                  onChange={formik.handleChange}
                  disabled={isLoading}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Recordarme
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formik.isValid}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Test Credentials Info (Only in Development) */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-2">Credenciales de prueba:</p>
              <p className="text-xs text-amber-700">
                <strong>Código:</strong> cortesec<br />
                <strong>Email:</strong> admin@cortesec.com<br />
                <strong>Password:</strong> admin123
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2025 CorteSec. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
