import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const EmailVerificationSent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [isResending, setIsResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendError, setResendError] = useState('');
    
    const email = location.state?.email || user?.email || '';
    const message = location.state?.message || 'Te hemos enviado un correo de verificación.';

    const handleResendEmail = async () => {
        if (!user) {
            setResendError('Debes estar logueado para reenviar el email de verificación.');
            return;
        }

        setIsResending(true);
        setResendMessage('');
        setResendError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/auth/resend-verification/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResendMessage(data.message);
            } else {
                if (data.already_verified) {
                    setResendMessage('Tu email ya está verificado. Puedes iniciar sesión.');
                    setTimeout(() => {
                        navigate('/login');
                    }, 2000);
                } else {
                    setResendError(data.message || 'Error al reenviar el correo de verificación.');
                }
            }
        } catch (error) {
            console.error('Error reenviando email:', error);
            setResendError('Error de conexión. Por favor, intenta de nuevo.');
        } finally {
            setIsResending(false);
        }
    };

    const handleGoToLogin = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    {/* Icono de email */}
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg 
                            className="w-8 h-8 text-blue-600" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                            />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        ¡Revisa tu Email!
                    </h2>
                    
                    <p className="text-gray-600 mb-4">
                        {message}
                    </p>

                    {email && (
                        <p className="text-sm text-gray-500 mb-6">
                            Hemos enviado un enlace de verificación a: <br />
                            <span className="font-medium text-gray-700">{email}</span>
                        </p>
                    )}

                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 text-left">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg 
                                    className="h-5 w-5 text-blue-400" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                    <path 
                                        fillRule="evenodd" 
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                                        clipRule="evenodd" 
                                    />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">
                                    Instrucciones importantes:
                                </h3>
                                <div className="mt-2 text-sm text-blue-700">
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Revisa tu bandeja de entrada y spam</li>
                                        <li>El enlace expira en 24 horas</li>
                                        <li>Haz clic en el enlace para verificar tu cuenta</li>
                                        <li>Después podrás iniciar sesión normalmente</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mensajes de reenvío */}
                    {resendMessage && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                            <p className="text-sm text-green-700">{resendMessage}</p>
                        </div>
                    )}

                    {resendError && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                            <p className="text-sm text-red-700">{resendError}</p>
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="space-y-3">
                        {user && (
                            <button
                                onClick={handleResendEmail}
                                disabled={isResending}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isResending ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Reenviando...
                                    </>
                                ) : (
                                    'Reenviar Correo de Verificación'
                                )}
                            </button>
                        )}
                        
                        <button
                            onClick={handleGoToLogin}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Ir al Login
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            ¿No recibiste el correo? Revisa tu carpeta de spam o{' '}
                            <Link 
                                to="/register" 
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                regístrate de nuevo
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailVerificationSent;
