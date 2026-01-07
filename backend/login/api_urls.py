"""
URLs de la API de Autenticación
===============================

URLs para las APIs REST de autenticación.

Autor: Sistema CorteSec
Versión: 2.0.0
Fecha: 2025-07-28
"""

from django.urls import path
from . import api_views, api_2fa

app_name = "auth_api"

urlpatterns = [
    # ==================== ÍNDICE DE API ====================
    path('', api_views.auth_api_index, name='index'),
    
    # ==================== AUTENTICACIÓN BÁSICA ====================
    path('login/', api_views.login_api, name='login'),
    path('logout/', api_views.logout_api, name='logout'),
    path('register/', api_views.register_api, name='register'),
    
    # ==================== PERFIL DE USUARIO ====================
    path('profile/', api_views.user_profile_api, name='profile'),
    path('profile/update/', api_views.update_profile_api, name='update_profile'),
    path('change-password/', api_views.change_password_api, name='change_password'),
    
    # ==================== VERIFICACIÓN DE EMAIL ====================
    path('verify-email/', api_views.verify_email_api, name='verify_email'),
    path('verify-email/<str:uid>/<str:token>/', api_views.verify_email_confirm_api, name='verify_email_confirm'),
    path('resend-verification/', api_views.resend_verification_email_api, name='resend_verification'),
    
    # ==================== RECUPERACIÓN DE CONTRASEÑA ====================
    path('password-reset/', api_views.password_reset_request_api, name='password_reset_request'),
    path('password-reset/confirm/', api_views.password_reset_confirm_api, name='password_reset_confirm'),
    
    # ==================== GRUPOS (ROLES) ====================
    path('groups/', api_views.list_groups, name='list_groups'),
    
    # ==================== AUTENTICACIÓN DE DOS FACTORES (2FA) ====================
    path('2fa/enable/', api_2fa.enable_2fa, name='enable_2fa'),
    path('2fa/verify/', api_2fa.verify_2fa, name='verify_2fa'),
    path('2fa/disable/', api_2fa.disable_2fa, name='disable_2fa'),
    
    # ==================== GESTIÓN DE SESIONES ====================
    path('sessions/', api_2fa.get_user_sessions, name='get_sessions'),
    path('sessions/terminate/', api_2fa.terminate_session, name='terminate_session'),
    path('sessions/terminate-all-other/', api_2fa.terminate_all_other_sessions, name='terminate_all_other'),
    
    # ==================== ALERTAS DE SEGURIDAD ====================
    path('security/alerts/', api_2fa.get_security_alerts, name='security_alerts'),
]
