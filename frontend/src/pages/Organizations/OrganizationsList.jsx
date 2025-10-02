import React, { useState, useEffect } from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useAppStore } from '../../store/index';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const OrganizationsList = () => {
    const { isAuthenticated } = useAppStore();
    const {
        organizations,
        currentOrganization,
        loading,
        switchOrganization,
        canManage,
        reloadOrganizations
    } = useOrganizations();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, active, inactive
    const [viewMode, setViewMode] = useState('grid'); // grid, list

    useEffect(() => {
        // Solo cargar organizaciones si el usuario está autenticado
        if (isAuthenticated) {
            console.log('[ORGS-LIST] User authenticated, loading organizations...');
            reloadOrganizations();
        } else {
            console.log('[ORGS-LIST] User not authenticated, skipping organization load');
        }
    }, [isAuthenticated]);

    const filteredOrganizations = organizations.filter(org => {
        const matchesSearch = org.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            org.codigo.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'all' || 
                            (filterType === 'active' && org.activo) ||
                            (filterType === 'inactive' && !org.activo);
        
        return matchesSearch && matchesFilter;
    });

    const handleSwitchOrganization = async (orgId) => {
        try {
            await switchOrganization(orgId);
        } catch (error) {
            console.error('Error switching organization:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando organizaciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                    Organizaciones
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Gestiona y cambia entre tus organizaciones
                                </p>
                            </div>

                            <div className="flex items-center space-x-3">
                                {canManage && (
                                    <Link
                                        to="/organizations/create"
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <i className="fas fa-plus mr-2"></i>
                                        Nueva Organización
                                    </Link>
                                )}
                                <Link
                                    to="/organizations/dashboard"
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <i className="fas fa-tachometer-alt mr-2"></i>
                                    Panel Actual
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        
                        {/* Search */}
                        <div className="flex-1 max-w-lg">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i className="fas fa-search text-gray-400"></i>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Buscar organizaciones..."
                                />
                            </div>
                        </div>

                        {/* Filters and View Controls */}
                        <div className="flex items-center space-x-4">
                            {/* Filter */}
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Todas</option>
                                <option value="active">Activas</option>
                                <option value="inactive">Inactivas</option>
                            </select>

                            {/* View Mode Toggle */}
                            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-2 text-sm font-medium ${
                                        viewMode === 'grid'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <i className="fas fa-th-large"></i>
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-2 text-sm font-medium ${
                                        viewMode === 'list'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <i className="fas fa-list"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>
                            {filteredOrganizations.length} de {organizations.length} organizaciones
                        </span>
                        {currentOrganization && (
                            <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Actual: {currentOrganization.nombre}
                            </span>
                        )}
                    </div>
                </div>

                {/* Organizations Grid/List */}
                {filteredOrganizations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-building text-gray-400 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No se encontraron organizaciones
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no tienes organizaciones'}
                        </p>
                        {canManage && (
                            <Link
                                to="/organizations/create"
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Crear Primera Organización
                            </Link>
                        )}
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredOrganizations.map((org) => (
                            <div
                                key={org.id}
                                className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all duration-200 overflow-hidden ${
                                    org.id === currentOrganization?.id ? 'ring-2 ring-blue-500' : ''
                                }`}
                            >
                                {/* Card Header */}
                                <div className="p-6">
                                    <div className="flex items-start space-x-4">
                                        {/* Logo */}
                                        <div className="flex-shrink-0">
                                            {org.logo ? (
                                                <img
                                                    src={org.logo}
                                                    alt={org.nombre}
                                                    className="h-12 w-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                                    <span className="text-white text-lg font-bold">
                                                        {org.nombre?.charAt(0)?.toUpperCase() || 'O'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Organization Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                                                        {org.nombre}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                        {org.codigo}
                                                    </p>
                                                </div>
                                                
                                                {/* Status & Current Indicator */}
                                                <div className="flex flex-col items-end space-y-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        org.activo 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                    }`}>
                                                        {org.activo ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                    {org.id === currentOrganization?.id && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                            <i className="fas fa-check mr-1"></i>
                                                            Actual
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {org.descripcion && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                                    {org.descripcion}
                                                </p>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                {org.tipo && (
                                                    <span className="flex items-center">
                                                        <i className="fas fa-tag mr-1"></i>
                                                        {org.tipo}
                                                    </span>
                                                )}
                                                {org.created_at && (
                                                    <span className="flex items-center">
                                                        <i className="fas fa-calendar mr-1"></i>
                                                        {new Date(org.created_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            {org.id !== currentOrganization?.id && (
                                                <button
                                                    onClick={() => handleSwitchOrganization(org.id)}
                                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center"
                                                >
                                                    <i className="fas fa-exchange-alt mr-1"></i>
                                                    Cambiar
                                                </button>
                                            )}
                                            <Link
                                                to={`/organizations/${org.id}`}
                                                className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                                            >
                                                <i className="fas fa-eye mr-1"></i>
                                                Ver
                                            </Link>
                                        </div>
                                        
                                        {canManage && (
                                            <div className="flex items-center space-x-2">
                                                <Link
                                                    to={`/organizations/${org.id}/edit`}
                                                    className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Link>
                                                <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    <i className="fas fa-ellipsis-v"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* List View */
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Organización
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Código
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Creada
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredOrganizations.map((org) => (
                                        <tr
                                            key={org.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                                org.id === currentOrganization?.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                            }`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {org.logo ? (
                                                            <img
                                                                src={org.logo}
                                                                alt={org.nombre}
                                                                className="h-10 w-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                                                <span className="text-white font-bold">
                                                                    {org.nombre?.charAt(0)?.toUpperCase() || 'O'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {org.nombre}
                                                            {org.id === currentOrganization?.id && (
                                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                                    Actual
                                                                </span>
                                                            )}
                                                        </div>
                                                        {org.descripcion && (
                                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                                {org.descripcion}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {org.codigo}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    org.activo 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                }`}>
                                                    {org.activo ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                {org.tipo || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {org.created_at ? new Date(org.created_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {org.id !== currentOrganization?.id && (
                                                        <button
                                                            onClick={() => handleSwitchOrganization(org.id)}
                                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                                        >
                                                            Cambiar
                                                        </button>
                                                    )}
                                                    <Link
                                                        to={`/organizations/${org.id}`}
                                                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                    >
                                                        Ver
                                                    </Link>
                                                    {canManage && (
                                                        <Link
                                                            to={`/organizations/${org.id}/edit`}
                                                            className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                                        >
                                                            Editar
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationsList;
