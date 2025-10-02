import React, { useState, useEffect } from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const OrganizationMembers = () => {
    const navigate = useNavigate();
    const {
        currentOrganization,
        members,
        loading,
        loadMembers,
        inviteMember,
        removeMember,
        updateMemberRole,
        canManage,
        isOwner
    } = useOrganizations();

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        role: 'MEMBER',
        message: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const roles = [
        { value: 'OWNER', label: 'Propietario', description: 'Control total de la organización', color: 'purple' },
        { value: 'ADMIN', label: 'Administrador', description: 'Gestión completa excepto configuración crítica', color: 'blue' },
        { value: 'MANAGER', label: 'Gerente', description: 'Gestión de equipos y procesos', color: 'green' },
        { value: 'MEMBER', label: 'Miembro', description: 'Acceso básico a las funciones', color: 'gray' },
        { value: 'VIEWER', label: 'Observador', description: 'Solo lectura de información', color: 'yellow' }
    ];

    useEffect(() => {
        if (currentOrganization && canManage) {
            loadMembers(currentOrganization.id);
        }
    }, [currentOrganization, canManage]);

    const filteredMembers = members.filter(member => {
        const matchesSearch = member.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            member.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            member.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = filterRole === 'all' || member.organization_role === filterRole;
        
        return matchesSearch && matchesRole;
    });

    const handleInvite = async (e) => {
        e.preventDefault();
        try {
            await inviteMember(inviteForm.email, inviteForm.role);
            setShowInviteModal(false);
            setInviteForm({ email: '', role: 'MEMBER', message: '' });
            // Reload members
            loadMembers(currentOrganization.id);
        } catch (error) {
            console.error('Error inviting member:', error);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateMemberRole(userId, newRole);
        } catch (error) {
            console.error('Error updating role:', error);
        }
    };

    const handleRemoveMember = async (userId, userName) => {
        if (window.confirm(`¿Estás seguro de que quieres remover a ${userName} de la organización?`)) {
            try {
                await removeMember(userId);
            } catch (error) {
                console.error('Error removing member:', error);
            }
        }
    };

    const getRoleInfo = (roleValue) => {
        return roles.find(role => role.value === roleValue) || roles.find(role => role.value === 'MEMBER');
    };

    if (!canManage) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-lock text-red-600 dark:text-red-400 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Acceso Denegado
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        No tienes permisos para gestionar miembros de esta organización
                    </p>
                    <button
                        onClick={() => navigate('/organizations/dashboard')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Volver al Panel
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Cargando miembros...</p>
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
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => navigate('/organizations/dashboard')}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <i className="fas fa-arrow-left text-xl"></i>
                                </button>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        Miembros del Equipo
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                                        {currentOrganization?.nombre} • Gestiona usuarios y permisos
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <i className="fas fa-user-plus mr-2"></i>
                                    Invitar Miembro
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-users text-blue-600 dark:text-blue-400"></i>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Miembros</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {members.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-crown text-purple-600 dark:text-purple-400"></i>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administradores</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {members.filter(m => ['OWNER', 'ADMIN'].includes(m.organization_role)).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-user-check text-green-600 dark:text-green-400"></i>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activos</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {members.filter(m => m.is_active).length}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-clock text-yellow-600 dark:text-yellow-400"></i>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendientes</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {members.filter(m => !m.is_active).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
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
                                    placeholder="Buscar miembros..."
                                />
                            </div>
                        </div>

                        {/* Role Filter */}
                        <div className="flex items-center space-x-4">
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                className="block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Todos los roles</option>
                                {roles.map(role => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        {filteredMembers.length} de {members.length} miembros
                    </div>
                </div>

                {/* Members List */}
                {filteredMembers.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i className="fas fa-users text-gray-400 text-3xl"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            No se encontraron miembros
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no hay miembros en esta organización'}
                        </p>
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <i className="fas fa-user-plus mr-2"></i>
                            Invitar Primer Miembro
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Miembro
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Rol
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Último Acceso
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredMembers.map((member) => {
                                        const roleInfo = getRoleInfo(member.organization_role);
                                        return (
                                            <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            {member.avatar ? (
                                                                <img
                                                                    src={member.avatar}
                                                                    alt={`${member.first_name} ${member.last_name}`}
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                                                    <span className="text-white font-bold">
                                                                        {(member.first_name?.charAt(0) || '').toUpperCase()}
                                                                        {(member.last_name?.charAt(0) || '').toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {member.first_name} {member.last_name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {member.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {isOwner ? (
                                                        <select
                                                            value={member.organization_role}
                                                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                            className={`text-xs px-2.5 py-1.5 rounded-full font-medium border-0 bg-${roleInfo.color}-100 text-${roleInfo.color}-800 dark:bg-${roleInfo.color}-900/30 dark:text-${roleInfo.color}-300 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                        >
                                                            {roles.map(role => (
                                                                <option key={role.value} value={role.value}>
                                                                    {role.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${roleInfo.color}-100 text-${roleInfo.color}-800 dark:bg-${roleInfo.color}-900/30 dark:text-${roleInfo.color}-300`}>
                                                            {roleInfo.label}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        member.is_active 
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    }`}>
                                                        {member.is_active ? 'Activo' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {member.last_login 
                                                        ? new Date(member.last_login).toLocaleDateString()
                                                        : 'Nunca'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        {isOwner && member.organization_role !== 'OWNER' && (
                                                            <button
                                                                onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                                                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                            >
                                                                <i className="fas fa-trash"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Invitar Nuevo Miembro
                                </h3>
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={inviteForm.email}
                                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="usuario@ejemplo.com"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Rol
                                    </label>
                                    <select
                                        value={inviteForm.role}
                                        onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {roles.filter(role => role.value !== 'OWNER').map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label} - {role.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Mensaje (Opcional)
                                    </label>
                                    <textarea
                                        value={inviteForm.message}
                                        onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Mensaje personalizado para la invitación..."
                                    />
                                </div>

                                <div className="flex items-center justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        <i className="fas fa-paper-plane mr-2"></i>
                                        Enviar Invitación
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizationMembers;
