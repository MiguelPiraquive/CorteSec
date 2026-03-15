import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { Mail, AlertCircle, Send, ArrowLeft, CheckCircle, Shield, KeyRound, Lock } from 'lucide-react'

import authService from '../../services/authService'

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Email invalido')
      .required('El email es requerido'),
  })

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)

      try {
        const response = await authService.requestPasswordReset(values.email)

        if (response.success) {
          setEmailSent(true)
          toast.success('Correo enviado! Revisa tu bandeja de entrada.')
        } else {
          toast.error(response.message || 'Error al enviar el correo')
        }
      } catch (error) {
        console.error('Password reset error:', error)

        if (error.message) {
          toast.error(error.message)
        } else {
          toast.error('Error al solicitar recuperacion de contrasena')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  if (emailSent) {
    return (
      <div className="h-screen flex overflow-hidden">
        {/* Panel Izquierdo */}
        <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-gradient-to-br from-primary-600 via-blue-500 to-primary-700 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-300/10 rounded-full blur-2xl" />

          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
            <div className="flex items-center gap-3 animate-in">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-lg font-bold tracking-tight">CorteSec</span>
            </div>

            <div className="space-y-6 animate-in">
              {/* Lock/Key illustration */}
              <div className="flex items-center gap-4 mb-2">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <Mail className="w-8 h-8 text-blue-200" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400/90 rounded-lg flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
                Revisa tu{' '}
                <span className="text-blue-200">bandeja de entrada</span>
              </h2>
              <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
                Te hemos enviado un correo con las instrucciones para restablecer tu contrasena de forma segura.
              </p>
            </div>

            <p className="text-blue-200/40 text-xs animate-in">
              &copy; 2026 CorteSec. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Panel Derecho - Confirmacion */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 sm:p-10 relative overflow-y-auto">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

          <div className="w-full max-w-[420px] relative z-10">
            {/* Logo mobile */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10 animate-in">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">CorteSec</span>
            </div>

            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl mb-5 shadow-lg shadow-green-200">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Correo Enviado!
              </h2>
              <p className="text-gray-500 text-[15px] mb-5">
                Hemos enviado un correo a <strong className="text-gray-700">{formik.values.email}</strong> con instrucciones para restablecer tu contrasena.
              </p>

              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 mb-5">
                <p className="text-sm text-blue-700">
                  <strong>Importante:</strong> El enlace expirara en 24 horas por seguridad.
                </p>
              </div>

              <p className="text-sm text-gray-400 mb-6">
                Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
              </p>

              <Link
                to="/login"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
                Volver al login
              </Link>
            </div>

            <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
              &copy; 2026 CorteSec. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Panel Izquierdo */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-gradient-to-br from-primary-600 via-blue-500 to-primary-700 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-300/10 rounded-full blur-2xl" />

        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          <div className="flex items-center gap-3 animate-in">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-lg font-bold tracking-tight">CorteSec</span>
          </div>

          <div className="space-y-6 animate-in">
            {/* Lock/Key illustration concept */}
            <div className="flex items-center gap-4 mb-2">
              <div className="relative">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 animate-pulse" style={{ animationDuration: '3s' }}>
                  <Lock className="w-8 h-8 text-blue-200" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-300/80 rounded-lg flex items-center justify-center shadow-lg">
                  <KeyRound className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
              Recupera el acceso{' '}
              <span className="text-blue-200">a tu cuenta</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
              No te preocupes, te enviaremos instrucciones claras para que puedas restablecer tu contrasena de forma segura.
            </p>

            {/* Pasos */}
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white/25 transition-colors">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Ingresa tu email</p>
                  <p className="text-blue-200/60 text-[13px] mt-0.5">El correo asociado a tu cuenta</p>
                </div>
              </div>

              <div className="ml-[18px] w-px h-3 bg-white/15" />

              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white/25 transition-colors">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Revisa tu correo</p>
                  <p className="text-blue-200/60 text-[13px] mt-0.5">Recibiras un enlace de recuperacion</p>
                </div>
              </div>

              <div className="ml-[18px] w-px h-3 bg-white/15" />

              <div className="flex items-start gap-4 group">
                <div className="w-9 h-9 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:bg-white/25 transition-colors">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Crea tu nueva contrasena</p>
                  <p className="text-blue-200/60 text-[13px] mt-0.5">Elige una contrasena segura</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-blue-200/40 text-xs animate-in">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Panel Derecho (Formulario) */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 sm:p-10 relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

        <div className="w-full max-w-[420px] relative z-10">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 animate-in">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">CorteSec</span>
          </div>

          {/* Encabezado */}
          <div className="mb-8 animate-slide-in">
            <h2 className="text-2xl font-bold text-gray-900">
              Recuperar contrasena
            </h2>
            <p className="text-gray-500 mt-1.5 text-[15px]">
              Ingresa tu email y te enviaremos instrucciones
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

              {/* Info */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  Enviaremos un enlace seguro a tu correo para restablecer tu contrasena. El enlace expira en 24 horas.
                </p>
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
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-[18px] h-[18px]" />
                    Enviar Instrucciones
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Link de regreso */}
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
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

export default ForgotPasswordPage
