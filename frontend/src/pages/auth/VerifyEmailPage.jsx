import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { CheckCircle, XCircle, Shield, ArrowLeft, UserPlus, Mail } from 'lucide-react'

import authService from '../../services/authService'

const VerifyEmailPage = () => {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let redirectTimer = null

    const verifyEmail = async () => {
      try {
        const response = await authService.verifyEmail(uid, token)

        if (response.success) {
          setVerified(true)
          toast.success('Email verificado exitosamente!')

          redirectTimer = setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          setError(response.message || 'Error al verificar el email')
          toast.error(response.message || 'Error al verificar el email')
        }
      } catch (err) {
        console.error('Email verification error:', err)
        const errorMessage = err.message || 'El enlace de verificacion ha expirado o es invalido'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setVerifying(false)
      }
    }

    if (uid && token) {
      verifyEmail()
    } else {
      setError('Enlace de verificacion invalido')
      setVerifying(false)
    }

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer)
    }
  }, [uid, token, navigate])

  const getLeftPanelContent = () => {
    if (verifying) {
      return {
        title: 'Verificacion',
        highlight: 'de email',
        description: 'Estamos confirmando tu direccion de correo electronico para activar tu cuenta en CorteSec.',
      }
    }
    if (verified) {
      return {
        title: 'Email',
        highlight: 'verificado',
        description: 'Tu cuenta ha sido verificada exitosamente. Ya puedes acceder a todas las funciones de CorteSec.',
      }
    }
    return {
      title: 'Error de',
      highlight: 'verificacion',
      description: 'No pudimos verificar tu email. El enlace puede haber expirado o ser invalido.',
    }
  }

  const leftContent = getLeftPanelContent()

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
            {/* Verification illustration */}
            <div className="flex items-center gap-4 mb-2">
              <div className="relative">
                <div className={`w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 ${
                  verifying ? 'animate-pulse' : ''
                }`} style={verifying ? { animationDuration: '2s' } : {}}>
                  <Mail className="w-8 h-8 text-blue-200" />
                </div>
                {verified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-400/90 rounded-lg flex items-center justify-center shadow-lg animate-scale-in">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                {!verifying && !verified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-400/90 rounded-lg flex items-center justify-center shadow-lg animate-scale-in">
                    <XCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-snug">
              {leftContent.title}{' '}
              <span className="text-blue-200">{leftContent.highlight}</span>
            </h2>
            <p className="text-blue-100/80 text-base leading-relaxed max-w-md">
              {leftContent.description}
            </p>
          </div>

          <p className="text-blue-200/40 text-xs animate-in">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Panel Derecho */}
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

          {/* Estado: Verificando */}
          {verifying && (
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mb-5 shadow-lg shadow-primary-200">
                <svg className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '1.2s' }} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Verificando Email
              </h2>
              <p className="text-gray-500 text-[15px] mb-4">
                Por favor espera mientras verificamos tu email...
              </p>
              <div className="flex justify-center gap-1.5">
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }} />
                <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }} />
              </div>
            </div>
          )}

          {/* Estado: Verificado */}
          {!verifying && verified && (
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl mb-5 shadow-lg shadow-green-200">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Email Verificado!
              </h2>
              <p className="text-gray-500 text-[15px] mb-6">
                Tu email ha sido verificado exitosamente. Ya puedes iniciar sesion en tu cuenta.
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
          )}

          {/* Estado: Error */}
          {!verifying && !verified && (
            <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-7 sm:p-8 text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl mb-5 shadow-lg shadow-red-200">
                <XCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Error de Verificacion
              </h2>
              <p className="text-gray-500 text-[15px] mb-5">
                {error}
              </p>

              <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-700">
                  El enlace de verificacion puede haber expirado. Puedes solicitar un nuevo enlace desde tu perfil despues de iniciar sesion.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to="/login"
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
                >
                  <ArrowLeft className="w-[18px] h-[18px]" />
                  Ir al login
                </Link>
                <Link
                  to="/register"
                  className="btn-secondary w-full flex items-center justify-center gap-2 py-3 text-[15px]"
                >
                  <UserPlus className="w-[18px] h-[18px]" />
                  Crear nueva cuenta
                </Link>
              </div>
            </div>
          )}

          {/* Footer mobile */}
          <p className="lg:hidden text-center text-xs text-gray-400 mt-8">
            &copy; 2026 CorteSec. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
