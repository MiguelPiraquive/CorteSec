import React, { useState, useRef, useEffect } from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { Link } from 'react-router-dom';

const OrganizationSelector = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const {
        organizations,
        currentOrganization,
        loading,
        error,
        switchOrganization,
        canManage
    } = useOrganizations();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOrganizationSelect = async (orgId) => {
        if (orgId === currentOrganization?.id) {
            setIsOpen(false);
            return;
        }

        try {
            await switchOrganization(orgId);
            setIsOpen(false);
        } catch (error) {
            console.error('Error switching organization:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center space-x-2 px-3 py-2">
                <div className="animate-pulse h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="animate-pulse h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-3 py-2 text-red-600 dark:text-red-400 text-sm">
                <i className="fas fa-exclamation-circle mr-2"></i>
                Error
            </div>
        );
    }

    if (!currentOrganization) {
        return (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                <i className="fas fa-building mr-2"></i>
                Sin organización
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Current Organization Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
                {/* Organization Avatar */}
                <div className="flex-shrink-0">
                    {currentOrganization.logo ? (
                        <img
                            src={currentOrganization.logo}
                            alt={currentOrganization.nombre}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                                {currentOrganization.nombre?.charAt(0)?.toUpperCase() || 'O'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Organization Info */}
                <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {currentOrganization.nombre}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {currentOrganization.codigo}
                    </div>
                </div>

                {/* Dropdown Arrow */}
                <div className="flex-shrink-0">
                    <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Organizaciones
                            </h3>
                            {canManage && (
                                <Link
                                    to="/organizations/manage"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Gestionar
                                </Link>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {organizations.length} organización{organizations.length !== 1 ? 'es' : ''} disponible{organizations.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Organizations List */}
                    <div className="max-h-64 overflow-y-auto">
                        {organizations.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => handleOrganizationSelect(org.id)}
                                className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                    org.id === currentOrganization?.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                                        : ''
                                }`}
                            >
                                {/* Organization Avatar */}
                                <div className="flex-shrink-0">
                                    {org.logo ? (
                                        <img
                                            src={org.logo}
                                            alt={org.nombre}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">
                                                {org.nombre?.charAt(0)?.toUpperCase() || 'O'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Organization Details */}
                                <div className="flex-1 text-left min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {org.nombre}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {org.codigo}
                                    </div>
                                    {org.descripcion && (
                                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                                            {org.descripcion}
                                        </div>
                                    )}
                                </div>

                                {/* Current Indicator */}
                                {org.id === currentOrganization?.id && (
                                    <div className="flex-shrink-0">
                                        <i className="fas fa-check text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
                        <div className="flex items-center justify-between">
                            <Link
                                to="/organizations"
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                            >
                                <i className="fas fa-building mr-2"></i>
                                Ver todas
                            </Link>
                            {canManage && (
                                <Link
                                    to="/organizations/create"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md transition-colors flex items-center"
                                >
                                    <i className="fas fa-plus mr-1"></i>
                                    Nueva
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationSelector;