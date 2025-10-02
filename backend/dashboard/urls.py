# dashboard/urls_complete.py
"""
URLs COMPLETAS del Dashboard con todas las funcionalidades avanzadas
====================================================================

Este archivo incluye TODAS las URLs del sistema dashboard, 
incluyendo las vistas básicas y avanzadas.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import advanced_apis
from . import ai_analytics
from . import push_notifications
from . import realtime_data

app_name = "dashboard"

# Router para ViewSets de DRF - Comentado temporalmente
router = DefaultRouter()
# router.register(r'contractors', views.ContractorViewSet)
# router.register(r'projects', views.ProjectViewSet)
# router.register(r'payments', views.PaymentViewSet)

urlpatterns = [
    # ==================== DASHBOARD PRINCIPAL ====================
    path("", views.dashboard_principal, name="principal"),
    path("advanced/", views.dashboard_super_avanzado, name="dashboard_super_avanzado"),
    path("enterprise/", views.dashboard_super_avanzado, name="principal_enterprise"),
    
    # ==================== CONTRATISTAS ====================
    path('contractors/', views.contractors_list, name='contractors_list'),
    path('contractors/<uuid:pk>/', views.contractor_detail, name='contractor_detail'),
    path('contractors/create/', views.contractor_create, name='contractor_create'),
    path('contractors/<uuid:pk>/edit/', views.contractor_edit, name='contractor_edit'),
    path('contractors/<uuid:pk>/delete/', views.contractor_delete, name='contractor_delete'),
    
    # ==================== PROYECTOS ====================
    path('projects/', views.projects_list, name='projects_list'),
    path('projects/<uuid:pk>/', views.project_detail, name='project_detail'),
    path('projects/create/', views.project_create, name='project_create'),
    path('projects/<uuid:pk>/edit/', views.project_edit, name='project_edit'),
    path('projects/<uuid:pk>/delete/', views.project_delete, name='project_delete'),
    
    # ==================== PAGOS ====================
    path('payments/', views.payments_list, name='payments_list'),
    path('payments/<uuid:pk>/', views.payment_detail, name='payment_detail'),
    path('payments/create/', views.payment_create, name='payment_create'),
    path('payments/<uuid:pk>/edit/', views.payment_edit, name='payment_edit'),
    path('payments/<uuid:pk>/delete/', views.payment_delete, name='payment_delete'),
    
    # ==================== REPORTES AVANZADOS ====================
    path('reports/', views.advanced_reports, name='advanced_reports'),
    path('system-test/', views.system_test, name='system_test'),
    
    # ==================== APIs BÁSICAS ====================
    path('api/metrics/', views.api_dashboard_metrics, name='api_dashboard_metrics'),
    path('api/contractors/search/', views.api_contractors_search, name='api_contractors_search'),
    
    # ==================== APIs PARA REACT DASHBOARD ====================
    path('api/activity-heatmap/', views.api_activity_heatmap, name='api_activity_heatmap'),
    path('api/historical-data/', views.api_historical_data, name='api_historical_data'),
    path('api/kpi-trends/', views.api_kpi_trends, name='api_kpi_trends'),
    path('api/department-activity/', views.api_advanced_analytics, name='api_department_activity'),
    path('api/hourly-patterns/', views.api_advanced_analytics, name='api_hourly_patterns'),
    path('api/productivity-heatmap/', views.api_productivity_heatmap, name='api_productivity_heatmap'),
    path('api/search-suggestions/', views.api_intelligent_search, name='api_search_suggestions'),
    
    # ==================== APIs AVANZADAS ====================
    path('api/system-monitoring/', views.api_system_monitoring, name='api_system_monitoring'),
    path('api/intelligent-search/', views.api_intelligent_search, name='api_intelligent_search'),
    path('api/advanced-analytics/', views.api_advanced_analytics, name='api_advanced_analytics'),
    path('api/export-data/', views.api_export_data, name='api_export_data'),
    
    # ==================== ADVANCED APIs (EXISTENTES) - Comentado temporalmente ====================
    # path('api/dashboard-summary/', advanced_apis.dashboard_summary, name='dashboard-summary'),
    # path('api/export-data-legacy/', advanced_apis.export_data, name='export-data-legacy'),
    # path('api/performance-metrics/', advanced_apis.performance_metrics, name='performance-metrics'),
    # path('api/search/', advanced_apis.search_global, name='search-global'),
    
    # ==================== AI ANALYTICS - Comentado temporalmente ====================
    # path('api/ai/performance-prediction/', ai_analytics.contractor_performance_prediction, name='ai-performance-prediction'),
    # path('api/ai/salary-intelligence/', ai_analytics.salary_intelligence, name='ai-salary-intelligence'),
    # path('api/ai/predictive-analytics/', ai_analytics.predictive_analytics, name='ai-predictive-analytics'),
    
    # ==================== PUSH NOTIFICATIONS - Comentado temporalmente ====================
    # path('api/notifications/send/', push_notifications.send_notification, name='send-notification'),
    # path('api/notifications/', push_notifications.get_notifications, name='get-notifications'),
    
    # ==================== REALTIME DATA - Comentado temporalmente ====================
    # path('api/realtime/metrics/', realtime_data.realtime_metrics, name='realtime-metrics'),
    # path('api/realtime/updates/', realtime_data.realtime_updates, name='realtime-updates'),
    
    # ==================== REST FRAMEWORK APIs ====================
    # path('api/', include(router.urls)),  # Comentado temporalmente por conflicto de formato
]

# URLs adicionales para compatibilidad con el sistema original
legacy_patterns = [
    # Dashboard views from original system
    path('dashboard/', views.dashboard_super_avanzado, name='dashboard'),
    path('dashboard/metrics/', views.api_system_monitoring, name='dashboard_metrics'),
    path('dashboard/analytics/', views.api_advanced_analytics, name='dashboard_analytics'),
    
    # Search and filtering
    path('search/', views.api_intelligent_search, name='search'),
    path('search/intelligent/', views.api_intelligent_search, name='search_intelligent'),
    
    # System monitoring
    path('system/', views.system_test, name='system'),
    path('system/metrics/', views.api_system_monitoring, name='system_metrics'),
    path('system/test/', views.system_test, name='system_test'),
    
    # Reports
    path('reports/advanced/', views.advanced_reports, name='reports_advanced'),
    path('reports/export/', views.api_export_data, name='reports_export'),
]

urlpatterns += legacy_patterns
