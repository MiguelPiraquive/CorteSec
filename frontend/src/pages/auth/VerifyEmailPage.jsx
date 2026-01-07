import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Mail, CheckCircle, XCircle, Loader } from 'lucide-react'

import authService from '../../services/authService'

const VerifyEmailPage = () => {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await authService.verifyEmail(uid, token)
        
        if (response.success) {
          setVerified(true)
          toast.success('¡Email verificado exitosamente!')
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          setError(response.message || 'Error al verificar el email')
          toast.error(response.message || 'Error al verificar el email')
        }
      } catch (err) {
        console.error('Email verification error:', err)
        const errorMessage = err.message || 'El enlace de verificación ha expirado o es inválido'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setVerifying(false)
      }
    }

    if (uid && token) {
      verifyEmail()
    } else {
      setError('Enlace de verificación inválido')
      setVerifying(false)
    }
  }, [uid, token, navigate])

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-full mb-4">
              <Loader className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verificando Email</h2>
            <p className="text-gray-600">Por favor espera mientras verificamos tu email...</p>
          </div>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Email Verificado!
            </h2>
            <p className="text-gray-600 mb-6">
              Tu email ha sido verificado exitosamente. Ya puedes iniciar sesión en tu cuenta.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500 rounded-full mb-4">
            <XCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error de Verificación
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              El enlace de verificación puede haber expirado. Puedes solicitar un nuevo enlace desde tu perfil después de iniciar sesión.
            </p>
          </div>
          <div className="space-y-3">
            <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
              Ir al login
            </Link>
            <Link to="/register" className="btn-secondary w-full inline-flex items-center justify-center gap-2">
              Crear nueva cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmailPage
