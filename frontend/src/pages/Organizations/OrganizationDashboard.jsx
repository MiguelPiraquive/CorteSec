import React, { useState, useEffect } from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const OrganizationDashboard = () => {
    const {
        currentOrganization,
        organizationStats,
        loading,
        isOwner,
        isAdmin,
        canManage
    } = useOrganizations();

    const [quickActions, setQuickActions] = useState([
        {
            id: 'employees',
            title: 'Gestionar Empleados',
            description: 'Agregar, editar y administrar empleados',
            icon: 'fas fa-users',
            color: 'blue',
            route: '/empleados',
            enabled: true
        },
        {
            id: 'payroll',
            title: 'Gestión de Nómina',
            description: 'Procesar pagos y administrar nóminas',
            icon: 'fas fa-money-bill-wave',
            color: 'green',
            route: '/payroll',
            enabled: true
        },
        {
            id: 'departments',
            title: 'Departamentos',
            description: 'Organizar estructura departamental',
            icon: 'fas fa-sitemap',
            color: 'purple',
            route: '/cargos',
            enabled: true
        },
        {
            id: 'reports',
            title: 'Reportes',
            description: 'Generar reportes organizacionales',
            icon: 'fas fa-chart-bar',
            color: 'orange',
            route: '/reportes',
            enabled: true
        },
        {
            id: 'settings',
            title: 'Configuración',
            description: 'Ajustes de la organización',
            icon: 'fas fa-cog',
            color: 'gray',
            route: '/organizations/settings',
            enabled: canManage
        },
        {
            id: 'members',
            title: 'Miembros del Equipo',
            description: 'Gestionar usuarios y permisos',
            icon: 'fas fa-user-friends',
            color: 'indigo',
            route: '/organizations/members',
            enabled: canManage
        }
    ]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando panel organizacional...</p>
                </div>
            </div>
        );
    }

    if (!currentOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-building text-gray-400 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Sin Organización Activa
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Selecciona una organización para acceder al panel de gestión
                    </p>
                    <Link
                        to="/organizations"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <i className="fas fa-plus mr-2"></i>
                        Ver Organizaciones
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Organization Logo */}
                                <div className="flex-shrink-0">
                                    {currentOrganization.logo ? (
                                        <img
                                            src={currentOrganization.logo}
                                            alt={currentOrganization.nombre}
                                            className="h-16 w-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-white text-2xl font-bold">
                                                {currentOrganization.nombre?.charAt(0)?.toUpperCase() || 'O'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Organization Info */}
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {currentOrganization.nombre}
                                    </h1>
                                    <div className="flex items-center space-x-4 mt-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            <i className="fas fa-code mr-1"></i>
                                            {currentOrganization.codigo}
                                        </span>
                                        {currentOrganization.tipo && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                {currentOrganization.tipo}
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            currentOrganization.activo 
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                            {currentOrganization.activo ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </div>
                                    {currentOrganization.descripcion && (
                                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                                            {currentOrganization.descripcion}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-3">
                                {canManage && (
                                    <Link
                                        to="/organizations/settings"
                                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <i className="fas fa-cog mr-2"></i>
                                        Configurar
                                    </Link>
                                )}
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <i className="fas fa-chart-line mr-2"></i>
                                    Ver Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Statistics Cards */}
                {organizationStats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Empleados</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {organizationStats.empleados || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-sitemap text-green-600 dark:text-green-400"></i>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Departamentos</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {organizationStats.departamentos || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-project-diagram text-purple-600 dark:text-purple-400"></i>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Proyectos</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {organizationStats.proyectos || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-user-friends text-orange-600 dark:text-orange-400"></i>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Miembros</p>
                                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                        {organizationStats.miembros || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions Grid */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Acciones Rápidas
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Gestiona tu organización de manera eficiente
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quickActions.filter(action => action.enabled).map((action) => (
                            <Link
                                key={action.id}
                                to={action.route}
                                className="group bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-center space-x-4">
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-${action.color}-100 dark:bg-${action.color}-900/30 group-hover:bg-${action.color}-200 dark:group-hover:bg-${action.color}-900/50 transition-colors`}>
                                            <i className={`${action.icon} text-${action.color}-600 dark:text-${action.color}-400 text-xl`}></i>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {action.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {action.description}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <i className="fas fa-arrow-right text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"></i>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity & Organization Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Recent Activity */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Actividad Reciente
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {/* Placeholder for recent activity */}
                                    {[1, 2, 3, 4, 5].map((item) => (
                                        <div key={item} className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                <i className="fas fa-user text-blue-600 dark:text-blue-400 text-sm"></i>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-white">
                                                    <span className="font-medium">Usuario</span> realizó una acción
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Hace {item} hora{item !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        to="/activity"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                                    >
                                        Ver toda la actividad →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Organization Details */}
                    <div className="space-y-6">
                        
                        {/* Organization Info Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Información de la Organización
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Código</dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">{currentOrganization.codigo}</dd>
                                </div>
                                {currentOrganization.telefono && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Teléfono</dt>
                                        <dd className="text-sm text-gray-900 dark:text-white">{currentOrganization.telefono}</dd>
                                    </div>
                                )}
                                {currentOrganization.email && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</dt>
                                        <dd className="text-sm text-gray-900 dark:text-white">{currentOrganization.email}</dd>
                                    </div>
                                )}
                                {currentOrganization.direccion && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Dirección</dt>
                                        <dd className="text-sm text-gray-900 dark:text-white">{currentOrganization.direccion}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Tu Rol</dt>
                                    <dd className="text-sm text-gray-900 dark:text-white">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            isOwner ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                            isAdmin ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                        }`}>
                                            {isOwner ? 'Propietario' : isAdmin ? 'Administrador' : 'Miembro'}
                                        </span>
                                    </dd>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Enlaces Rápidos
                            </h3>
                            <div className="space-y-2">
                                <Link
                                    to="/help"
                                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <i className="fas fa-question-circle mr-2"></i>
                                    Centro de Ayuda
                                </Link>
                                <Link
                                    to="/support"
                                    className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    <i className="fas fa-headset mr-2"></i>
                                    Soporte Técnico
                                </Link>
                                {canManage && (
                                    <>
                                        <Link
                                            to="/organizations/backup"
                                            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            <i className="fas fa-download mr-2"></i>
                                            Respaldar Datos
                                        </Link>
                                        <Link
                                            to="/organizations/analytics"
                                            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                            <i className="fas fa-chart-pie mr-2"></i>
                                            Analytics
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationDashboard;
