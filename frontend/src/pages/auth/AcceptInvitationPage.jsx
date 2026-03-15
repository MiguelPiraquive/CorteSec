import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import {
  Lock, Mail, Eye, EyeOff, UserPlus, AlertCircle,
  User, Phone, CheckCircle, Building2, XCircle, Clock, Shield
} from 'lucide-react'

import { useTenant } from '../../context/TenantContext'
import invitacionService from '../../services/invitacionService'

const AcceptInvitationPage = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { setTenant } = useTenant()

  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const roleLabels = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    MEMBER: 'Miembro',
    VIEWER: 'Visor',
  }

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        setLoading(true)
        const data = await invitacionService.validateToken(token)
        if (data.success && data.invitation) {
          setInvitation(data.invitation)
        } else {
          setError(data.message || 'Invitacion no valida')
        }
      } catch (err) {
        setError(err.message || 'No se pudo validar la invitacion')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      validateInvitation()
    }
  }, [token])

  const validationSchema = Yup.object({
    username: Yup.string()
      .required('El nombre de usuario es requerido')
      .min(3, 'Minimo 3 caracteres')
      .max(150, 'Maximo 150 caracteres')
      .matches(/^[a-zA-Z0-9_]+$/, 'Solo letras, numeros y guiones bajos'),
    firstName: Yup.string()
      .required('El nombre es requerido')
      .min(2, 'Minimo 2 caracteres')
      .max(50, 'Maximo 50 caracteres'),
    lastName: Yup.string()
      .required('El apellido es requerido')
      .min(2, 'Minimo 2 caracteres')
      .max(50, 'Maximo 50 caracteres'),
    phone: Yup.string()
      .matches(/^[+]?[0-9\s-()]*$/, 'Telefono invalido')
      .max(20, 'Maximo 20 caracteres'),
    password: Yup.string()
      .required('La contrasena es requerida')
      .min(12, 'Minimo 12 caracteres')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Debe contener mayuscula, minuscula, numero y caracter especial'
      ),
    passwordConfirm: Yup.string()
      .required('Confirma tu contrasena')
      .oneOf([Yup.ref('password'), null], 'Las contrasenas no coinciden'),
  })

  const formik = useFormik({
    initialValues: {
      username: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsSubmitting(true)

      try {
        const data = {
          token,
          username: values.username,
          password: values.password,
          password_confirm: values.passwordConfirm,
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
        }

        const response = await invitacionService.acceptInvitation(data)

        if (response.success) {
          // Set tenant from response
          if (response.organization) {
            setTenant(response.organization.codigo, response.organization.slug || response.organization.codigo)
          }

          toast.success('Cuenta creada exitosamente. Bienvenido!')
          navigate('/dashboard')
        } else {
          toast.error(response.message || 'Error al aceptar la invitacion')
        }
      } catch (err) {
        console.error('Accept invitation error:', err)
        if (err.message) {
          toast.error(err.message)
        } else if (err.errors) {
          Object.keys(err.errors).forEach((key) => {
            const errorMessages = err.errors[key]
            if (Array.isArray(errorMessages)) {
              errorMessages.forEach((msg) => toast.error(`${key}: ${msg}`))
            } else {
              toast.error(`${key}: ${errorMessages}`)
            }
          })
        } else {
          toast.error('Error al crear la cuenta')
        }
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando invitacion...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitacion no valida</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2"
            >
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Expired state
  if (invitation && !invitation.is_valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
              <Clock className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invitacion expirada</h2>
            <p className="text-gray-600 mb-6">
              Esta invitacion ha expirado o ya fue utilizada. Contacta al administrador de la organizacion para solicitar una nueva.
            </p>
            <Link
              to="/login"
              className="btn-primary inline-flex items-center gap-2"
            >
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Valid invitation - show registration form
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Unirte a una Organizacion</h1>
          <p className="text-gray-600">Completa tu registro para unirte al equipo</p>
        </div>

        {/* Invitation Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Organization Info */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">
                  {invitation.organization_nombre}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-primary-700">
                    Rol: {roleLabels[invitation.role] || invitation.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{invitation.email}</span>
                </div>
                {invitation.invited_by_name && (
                  <p className="text-sm text-gray-500 mt-1">
                    Invitado por: {invitation.invited_by_name}
                  </p>
                )}
              </div>
            </div>
            {invitation.mensaje && (
              <div className="mt-4 p-3 bg-white/70 rounded-lg border border-primary-100">
                <p className="text-sm text-gray-700 italic">"{invitation.mensaje}"</p>
              </div>
            )}
          </div>

          {/* Registration Form */}
          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="usuario123"
                    className={`input-field pl-10 ${
                      formik.touched.username && formik.errors.username ? 'input-error' : ''
                    }`}
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isSubmitting}
                  />
                </div>
                {formik.touched.username && formik.errors.username && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.username}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefono (opcional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    className={`input-field pl-10 ${
                      formik.touched.phone && formik.errors.phone ? 'input-error' : ''
                    }`}
                    value={formik.values.phone}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isSubmitting}
                  />
                </div>
                {formik.touched.phone && formik.errors.phone && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.phone}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Juan"
                  className={`input-field ${
                    formik.touched.firstName && formik.errors.firstName ? 'input-error' : ''
                  }`}
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSubmitting}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Perez"
                  className={`input-field ${
                    formik.touched.lastName && formik.errors.lastName ? 'input-error' : ''
                  }`}
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSubmitting}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contrasena *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className={`input-field pl-10 pr-10 ${
                      formik.touched.password && formik.errors.password ? 'input-error' : ''
                    }`}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
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

              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contrasena *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className={`input-field pl-10 pr-10 ${
                      formik.touched.passwordConfirm && formik.errors.passwordConfirm ? 'input-error' : ''
                    }`}
                    value={formik.values.passwordConfirm}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  >
                    {showPasswordConfirm ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                {formik.touched.passwordConfirm && formik.errors.passwordConfirm && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.passwordConfirm}
                  </p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos de contrasena:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" /> Minimo 12 caracteres
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" /> Mayuscula, minuscula, numero y caracter especial
                </li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !formik.isValid}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Unirme a {invitation?.organization_nombre}
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Inicia sesion
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          2025 CorteSec. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}

export default AcceptInvitationPage
