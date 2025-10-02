import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const EmailVerification = () => {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const { setUser } = useAuth();
    
    const [verificationState, setVerificationState] = useState({
        loading: true,
        success: false,
        error: null,
        message: ''
    });

    useEffect(() => {
        const verifyEmail = async () => {
            if (!uid || !token) {
                setVerificationState({
                    loading: false,
                    success: false,
                    error: 'INVALID_LINK',
                    message: 'Enlace de verificación inválido.'
                });
                return;
            }

            try {
                const response = await fetch(`http://localhost:8000/api/auth/verify-email/${uid}/${token}/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    setVerificationState({
                        loading: false,
                        success: true,
                        error: null,
                        message: data.message
                    });

                    // Si ya estaba verificado, mostrar mensaje diferente
                    if (data.already_verified) {
                        setTimeout(() => {
                            navigate('/login');
                        }, 3000);
                    } else {
                        // Email verificado exitosamente
                        setTimeout(() => {
                            navigate('/login', { 
                                state: { 
                                    message: 'Email verificado exitosamente. Ya puedes iniciar sesión.',
                                    type: 'success'
                                }
                            });
                        }, 3000);
                    }
                } else {
                    setVerificationState({
                        loading: false,
                        success: false,
                        error: data.error_code || 'VERIFICATION_FAILED',
                        message: data.message || 'Error al verificar el email.'
                    });
                }
            } catch (error) {
                console.error('Error verificando email:', error);
                setVerificationState({
                    loading: false,
                    success: false,
                    error: 'NETWORK_ERROR',
                    message: 'Error de conexión. Por favor, intenta de nuevo.'
                });
            }
        };

        verifyEmail();
    }, [uid, token, navigate, setUser]);

    const handleGoToLogin = () => {
        navigate('/login');
    };

    const handleGoToRegister = () => {
        navigate('/register');
    };

    if (verificationState.loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full space-y-8 p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Verificando tu email...
                        </h2>
                        <p className="text-gray-600">
                            Por favor espera mientras verificamos tu dirección de correo.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    {verificationState.success ? (
                        <>
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <svg 
                                    className="w-8 h-8 text-green-600" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M5 13l4 4L19 7" 
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                ¡Email Verificado!
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {verificationState.message}
                            </p>
                            <p className="text-sm text-gray-500 mb-6">
                                Serás redirigido al login en unos segundos...
                            </p>
                            <button
                                onClick={handleGoToLogin}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Ir al Login
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                <svg 
                                    className="w-8 h-8 text-red-600" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M6 18L18 6M6 6l12 12" 
                                    />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Error de Verificación
                            </h2>
                            <p className="text-gray-600 mb-6">
                                {verificationState.message}
                            </p>
                            
                            {verificationState.error === 'EXPIRED_TOKEN' && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                    <p className="text-sm text-yellow-700">
                                        El enlace ha expirado. Puedes solicitar un nuevo correo de verificación después de registrarte nuevamente.
                                    </p>
                                </div>
                            )}
                            
                            <div className="space-y-3">
                                <button
                                    onClick={handleGoToLogin}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Ir al Login
                                </button>
                                <button
                                    onClick={handleGoToRegister}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Registrarse de Nuevo
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailVerification;
