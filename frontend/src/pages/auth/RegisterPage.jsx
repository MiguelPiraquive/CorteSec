import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { toast } from 'react-toastify'
import { 
  Lock, Mail, Building2, Eye, EyeOff, UserPlus, AlertCircle, 
  User, Phone, CheckCircle, Info 
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'

const RegisterPage = () => {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { setTenant } = useTenant()
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)

  const validationSchema = Yup.object({
    tenantCode: Yup.string()
      .required('El código de organización es requerido')
      .min(2, 'El código debe tener al menos 2 caracteres')
      .max(50, 'El código no puede tener más de 50 caracteres')
      .matches(
        /^[a-zA-Z0-9-_]+$/,
        'El código solo puede contener letras, números, guiones y guiones bajos'
      ),
    username: Yup.string()
      .required('El nombre de usuario es requerido')
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
      .max(150, 'El nombre de usuario no puede tener más de 150 caracteres')
      .matches(
        /^[a-zA-Z0-9_]+$/,
        'El nombre de usuario solo puede contener letras, números y guiones bajos'
      ),
    email: Yup.string()
      .email('Email inválido')
      .required('El email es requerido'),
    firstName: Yup.string()
      .required('El nombre es requerido')
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(50, 'El nombre no puede tener más de 50 caracteres'),
    lastName: Yup.string()
      .required('El apellido es requerido')
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(50, 'El apellido no puede tener más de 50 caracteres'),
    fullName: Yup.string()
      .max(150, 'El nombre completo no puede tener más de 150 caracteres'),
    phone: Yup.string()
      .matches(/^[+]?[0-9\s-()]*$/, 'Teléfono inválido')
      .max(20, 'El teléfono no puede tener más de 20 caracteres'),
    password: Yup.string()
      .required('La contraseña es requerida')
      .min(12, 'La contraseña debe tener al menos 12 caracteres')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'
      ),
    passwordConfirm: Yup.string()
      .required('Debes confirmar la contraseña')
      .oneOf([Yup.ref('password'), null], 'Las contraseñas no coinciden'),
    acceptTerms: Yup.boolean()
      .oneOf([true], 'Debes aceptar los términos y condiciones'),
  })

  const formik = useFormik({
    initialValues: {
      tenantCode: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      fullName: '',
      phone: '',
      password: '',
      passwordConfirm: '',
      acceptTerms: false,
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true)
      
      try {
        // Set tenant before registration
        setTenant(values.tenantCode, values.tenantCode)
        
        // Prepare user data
        const userData = {
          username: values.username,
          email: values.email,
          first_name: values.firstName,
          last_name: values.lastName,
          full_name: values.fullName || `${values.firstName} ${values.lastName}`,
          phone: values.phone,
          password: values.password,
          password_confirm: values.passwordConfirm,
          tenant_code: values.tenantCode, // Enviar código de organización al backend
        }
        
        const response = await register(userData, values.tenantCode)
        
        if (response.success) {
          setRegistrationSuccess(true)
          toast.success(response.message || '¡Registro exitoso! Revisa tu email para verificar tu cuenta.')
          
          // Redirect after 3 seconds
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          toast.error(response.message || 'Error al registrarse')
        }
      } catch (error) {
        console.error('Registration error:', error)
        
        if (error.message) {
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
          toast.error('Error al registrarse. Por favor intenta de nuevo.')
        }
      } finally {
        setIsLoading(false)
      }
    },
  })

  // Auto-generate full_name when firstName or lastName changes
  useState(() => {
    if (formik.values.firstName || formik.values.lastName) {
      formik.setFieldValue('fullName', `${formik.values.firstName} ${formik.values.lastName}`.trim())
    }
  }, [formik.values.firstName, formik.values.lastName])

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Registro Exitoso!</h2>
            <p className="text-gray-600 mb-6">
              Te hemos enviado un correo electrónico a <strong>{formik.values.email}</strong> con un enlace para verificar tu cuenta.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Debes verificar tu email antes de poder iniciar sesión.
              </p>
            </div>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Ir al login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
          <p className="text-gray-600">Únete a CorteSec</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Sistema Multitenant:</strong> Cada organización tiene su propio espacio de trabajo aislado.
              Asegúrate de usar el código de organización correcto.
            </div>
          </div>

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
                  placeholder="ej: mi-empresa"
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Username Field */}
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
                    disabled={isLoading}
                  />
                </div>
                {formik.touched.username && formik.errors.username && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.username}
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

              {/* First Name Field */}
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
                  disabled={isLoading}
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido *
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Pérez"
                  className={`input-field ${
                    formik.touched.lastName && formik.errors.lastName ? 'input-error' : ''
                  }`}
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isLoading}
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="error-message flex items-center gap-1 mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {formik.errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono (Opcional)
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
                  disabled={isLoading}
                />
              </div>
              {formik.touched.phone && formik.errors.phone && (
                <p className="error-message flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4" />
                  {formik.errors.phone}
                </p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    placeholder="••••••••••••"
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

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Contraseña *
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
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    disabled={isLoading}
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
              <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos de contraseña:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" />
                  Mínimo 12 caracteres
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" />
                  Al menos una letra mayúscula y una minúscula
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" />
                  Al menos un número
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-gray-400" />
                  Al menos un carácter especial (@$!%*?&)
                </li>
              </ul>
            </div>

            {/* Terms and Conditions */}
            <div>
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  checked={formik.values.acceptTerms}
                  onChange={formik.handleChange}
                  disabled={isLoading}
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-700">
                  Acepto los{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                    términos y condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                    política de privacidad
                  </a>
                </label>
              </div>
              {formik.touched.acceptTerms && formik.errors.acceptTerms && (
                <p className="error-message flex items-center gap-1 mt-1 ml-6">
                  <AlertCircle className="w-4 h-4" />
                  {formik.errors.acceptTerms}
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
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Crear Cuenta
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

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Inicia sesión aquí
              </Link>
            </p>
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

export default RegisterPage
