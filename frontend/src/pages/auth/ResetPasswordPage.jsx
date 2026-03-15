import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Save, Shield, ArrowLeft, ShieldCheck } from 'lucide-react'

import authService from '../../services/authService'

const passwordRequirements = [
  { label: 'Minimo 12 caracteres', test: (pw) => pw.length >= 12 },
  { label: 'Al menos una mayuscula', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Al menos una minuscula', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Al menos un numero', test: (pw) => /\d/.test(pw) },
  { label: 'Un caracter especial (@$!%*?&)', test: (pw) => /[@$!%*?&]/.test(pw) },
]

const PasswordStrengthIndicator = ({ password }) => {
  const metCount = passwordRequirements.filter((req) => req.test(password)).length
  const total = passwordRequirements.length
  const percentage = (metCount / total) * 100

  const getStrengthColor = () => {
    if (percentage <= 20) return 'bg-red-500'
    if (percentage <= 40) return 'bg-orange-500'
    if (percentage <= 60) return 'bg-amber-500'
    if (percentage <= 80) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthLabel = () => {
    if (percentage <= 20) return 'Muy debil'
    if (percentage <= 40) return 'Debil'
    if (percentage <= 60) return 'Regular'
    if (percentage <= 80) return 'Buena'
    return 'Excelente'
  }

  const getStrengthLabelColor = () => {
    if (percentage <= 20) return 'text-red-600'
    if (percentage <= 40) return 'text-orange-600'
    if (percentage <= 60) return 'text-amber-600'
    if (percentage <= 80) return 'text-blue-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-3">
      {/* Strength bar */}
      {password.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Fortaleza</span>
            <span className={`text-xs font-semibold ${getStrengthLabelColor()}`}>{getStrengthLabel()}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${getStrengthColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Requirements list */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-600">Requisitos de contrasena:</p>
        {passwordRequirements.map((req, index) => {
          const met = password.length > 0 && req.test(password)
          return (
            <div key={index} className="flex items-center gap-2">
              <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                met
                  ? 'bg-green-500 scale-100'
                  : password.length > 0
                    ? 'bg-gray-200 scale-100'
                    : 'bg-gray-100 scale-95'
              }`}>
                {met ? (
                  <CheckCircle className="w-3 h-3 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                )}
              </div>
              <span className={`text-xs transition-colors duration-300 ${
                met ? 'text-green-700 font-medium' : 'text-gray-500'
              }`}>
                {req.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ResetPasswordPage = () => {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const validationSchema = Yup.object({
    newPassword: Yup.string()
      .required('La contrasena es requerida')
      .min(12, 'La contrasena debe tener al menos 12 caracteres')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'La contrasena debe contener al menos una mayuscula, una minuscula, un numero y un caracter especial'
      ),
    newPasswordConfirm: Yup.string()
      .required('Debes confirmar la contrasena')
      .oneOf([Yup.ref('newPassword'), null], 'Las contrasenas no coinciden'),
  })

  const formik = useFormik({
    initialValues: {
      newPassword: '',
      newPasswordConfirm: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)

      try {
        const response = await authService.confirmPasswordReset(
          uid,
          token,
          values.newPassword,
          values.newPasswordConfirm
        )

        if (response.success) {
          setResetSuccess(true)
          toast.success('Contrasena restablecida exitosamente!')

          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          toast.error(response.message || 'Error al restablecer la contrasena')
        }
      } catch (error) {
        console.error('Reset password error:', error)

        if (error.message) {
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
          toast.error('El enlace de recuperacion ha expirado o es invalido')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  if (resetSuccess) {
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
              <div className="flex items-center gap-4 mb-2">
                <div className="relative">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                    <ShieldCheck className="w-8 h-8 text-green-300" />
                  </div>
                </div>
              </div>

              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
                Contrasena{' '}
                <span className="text-blue-200">actualizada</span>
              </h2>
              <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
                Tu contrasena ha sido restablecida exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
              </p>
            </div>

            <p className="text-blue-200/40 text-xs animate-in">
              &copy; 2026 CorteSec. Todos los derechos reservados.
            </p>
          </div>
        </div>

        {/* Panel Derecho - Exito */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6 sm:p-10 relative overflow-y-auto">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

          <div className="w-full max-w-[420px] relative z-10">
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
                Contrasena Restablecida!
              </h2>
              <p className="text-gray-500 text-[15px] mb-6">
                Tu contrasena ha sido actualizada exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Seras redirigido al login en unos segundos...
              </p>
              <Link
                to="/login"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
              >
                Ir al login
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
            {/* Lock illustration */}
            <div className="flex items-center gap-4 mb-2">
              <div className="relative">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <Lock className="w-8 h-8 text-blue-200" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-300/80 rounded-lg flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
              Crea tu nueva{' '}
              <span className="text-blue-200">contrasena</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
              Elige una contrasena segura que no hayas usado antes. Una buena contrasena protege tu cuenta y tu informacion.
            </p>

            {/* Dynamic requirements on left panel */}
            <div className="space-y-2.5 pt-4">
              {passwordRequirements.map((req, index) => {
                const met = formik.values.newPassword.length > 0 && req.test(formik.values.newPassword)
                return (
                  <div key={index} className="flex items-center gap-3 transition-all duration-300">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                      met
                        ? 'bg-green-400/90 scale-110'
                        : 'bg-white/15'
                    }`}>
                      {met ? (
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-blue-200/70 rounded-full" />
                      )}
                    </div>
                    <p className={`text-sm transition-all duration-300 ${
                      met ? 'text-green-200 font-medium' : 'text-blue-100/70'
                    }`}>
                      {req.label}
                    </p>
                  </div>
                )
              })}
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
              Nueva contrasena
            </h2>
            <p className="text-gray-500 mt-1.5 text-[15px]">
              Ingresa tu nueva contrasena segura
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 animate-scale-in">
            <form onSubmit={formik.handleSubmit} className="space-y-5">
              {/* Nueva Contrasena */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nueva contrasena
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu nueva contrasena"
                    className={`input-field pl-11 pr-11 ${
                      formik.touched.newPassword && formik.errors.newPassword ? 'input-error' : ''
                    }`}
                    value={formik.values.newPassword}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {formik.touched.newPassword && formik.errors.newPassword && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirmar Contrasena */}
              <div>
                <label htmlFor="newPasswordConfirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar contrasena
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-[18px] w-[18px] text-gray-400" />
                  </div>
                  <input
                    id="newPasswordConfirm"
                    name="newPasswordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="Confirma tu contrasena"
                    className={`input-field pl-11 pr-11 ${
                      formik.touched.newPasswordConfirm && formik.errors.newPasswordConfirm ? 'input-error' : ''
                    }`}
                    value={formik.values.newPasswordConfirm}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    disabled={isLoading}
                  >
                    {showPasswordConfirm ? (
                      <EyeOff className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="h-[18px] w-[18px] text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
                {formik.touched.newPasswordConfirm && formik.errors.newPasswordConfirm && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.newPasswordConfirm}
                  </p>
                )}
              </div>

              {/* Dynamic password strength indicator - shown in the form card */}
              <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                <PasswordStrengthIndicator password={formik.values.newPassword} />
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-[18px] h-[18px]" />
                    Guardar Nueva Contrasena
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

export default ResetPasswordPage
