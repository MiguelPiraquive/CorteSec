import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { Mail, Building2, AlertCircle, Send, ArrowLeft, CheckCircle } from 'lucide-react'

import authService from '../../services/authService'
import { useTenant } from '../../context/TenantContext'

const ForgotPasswordPage = () => {
  const { setTenant } = useTenant()
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validationSchema = Yup.object({
    tenantCode: Yup.string()
      .required('El código de organización es requerido')
      .min(2, 'El código debe tener al menos 2 caracteres'),
    email: Yup.string()
      .email('Email inválido')
      .required('El email es requerido'),
  })

  const formik = useFormik({
    initialValues: {
      tenantCode: '',
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      
      try {
        // Set tenant before request
        setTenant(values.tenantCode, values.tenantCode)
        
        const response = await authService.requestPasswordReset(values.email, values.tenantCode)
        
        if (response.success) {
          setEmailSent(true)
          toast.success('¡Correo enviado! Revisa tu bandeja de entrada.')
        } else {
          toast.error(response.message || 'Error al enviar el correo')
        }
      } catch (error) {
        console.error('Password reset error:', error)
        
        if (error.message) {
          toast.error(error.message)
        } else {
          toast.error('Error al solicitar recuperación de contraseña')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Correo Enviado!</h2>
            <p className="text-gray-600 mb-6">
              Hemos enviado un correo electrónico a <strong>{formik.values.email}</strong> con instrucciones para restablecer tu contraseña.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> El enlace expirará en 24 horas por seguridad.
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-600">
            Ingresa tu email y te enviaremos instrucciones para recuperarla
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
                  placeholder="ej: cortesec"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !formik.isValid}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Instrucciones
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          © 2025 CorteSec. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
