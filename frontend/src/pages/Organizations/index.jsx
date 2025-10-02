import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Import components
import OrganizationsList from './OrganizationsList';
import OrganizationDashboard from './OrganizationDashboard';
import OrganizationSettings from './OrganizationSettings';
import OrganizationMembers from './OrganizationMembers';

const OrganizationsIndex = () => {
    return (
        <Routes>
            {/* Lista de organizaciones */}
            <Route path="/" element={<OrganizationsList />} />
            
            {/* Dashboard organizacional */}
            <Route path="/dashboard" element={<OrganizationDashboard />} />
                
                {/* Configuración de la organización */}
                <Route path="/settings" element={<OrganizationSettings />} />
                <Route path="/:id/settings" element={<OrganizationSettings />} />
                
                {/* Gestión de miembros */}
                <Route path="/members" element={<OrganizationMembers />} />
                <Route path="/:id/members" element={<OrganizationMembers />} />
                
                {/* Vista detallada de organización específica */}
                <Route path="/:id" element={<OrganizationDashboard />} />
                
                {/* Edición de organización */}
                <Route path="/:id/edit" element={<OrganizationSettings />} />
                
                {/* Gestión específica */}
                <Route path="/manage" element={<OrganizationSettings />} />
                
                {/* Crear nueva organización */}
                <Route path="/create" element={<CreateOrganization />} />
            </Routes>
    );
};

// Simple Create Organization Component (placeholder)
const CreateOrganization = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                    <i className="fas fa-plus text-blue-600 dark:text-blue-400 text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Crear Nueva Organización
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Funcionalidad en desarrollo
                </p>
                <a
                    href="/organizations"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Volver a Organizaciones
                </a>
            </div>
        </div>
    );
};

export default OrganizationsIndex;
