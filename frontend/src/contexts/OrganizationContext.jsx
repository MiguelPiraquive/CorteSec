import React, { createContext, useState, useEffect } from 'react';
import organizationService from '../services/organizationService';
import { toast } from 'react-toastify';

export const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
    const [organizations, setOrganizations] = useState([]);
    const [currentOrganization, setCurrentOrganization] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [organizationStats, setOrganizationStats] = useState(null);
    const [members, setMembers] = useState([]);
    const [isManaging, setIsManaging] = useState(false);

    // Load organizations on mount SOLO si el usuario está autenticado
    useEffect(() => {
        // Verificar si hay token de autenticación
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) {
            console.log('🔐 Token encontrado, cargando organizaciones...');
            loadOrganizations();
        } else {
            console.log('❌ No hay token, saltando carga de organizaciones');
            setLoading(false);
        }
    }, []);

    // Auto-save current organization to localStorage
    useEffect(() => {
        if (currentOrganization) {
            localStorage.setItem('currentOrganization', JSON.stringify(currentOrganization));
        }
    }, [currentOrganization]);

    const loadOrganizations = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🏢 Loading organizations...');
            
            // Cargar organizaciones
            const orgs = await organizationService.getOrganizations();
            console.log('🏢 Loaded organizations:', orgs);
            setOrganizations(orgs || []);
            
            // Intentar cargar organización actual
            let current = null;
            try {
                current = await organizationService.getCurrentOrganization();
                console.log('🏢 Current organization:', current);
            } catch (currentOrgError) {
                console.warn('⚠️ No current organization, using first available');
                if (orgs && orgs.length > 0) {
                    current = orgs[0];
                    console.log('🏢 Using first org as current:', current);
                }
            }
            
            setCurrentOrganization(current);
            
            // Load organization stats if we have a current org
            if (current) {
                await loadOrganizationStats(current.id);
            }
            
        } catch (err) {
            setError('Error loading organizations');
            console.error('❌ Error loading organizations:', err);
            toast.error(`Error al cargar organizaciones: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    };

    const loadOrganizationStats = async (orgId) => {
        try {
            const stats = await organizationService.getOrganizationStats(orgId);
            setOrganizationStats(stats);
        } catch (err) {
            console.error('Error loading organization stats:', err);
        }
    };

    const loadMembers = async (orgId) => {
        try {
            const membersList = await organizationService.getOrganizationMembers(orgId);
            setMembers(membersList || []);
        } catch (err) {
            console.error('Error loading members:', err);
            toast.error('Error al cargar miembros');
        }
    };

    const switchOrganization = async (organizationId) => {
        if (!organizationId) return;
        
        try {
            setLoading(true);
            const response = await organizationService.switchOrganization(organizationId);
            
            // Update current organization
            setCurrentOrganization(response);
            
            // Load new stats
            await loadOrganizationStats(organizationId);
            
            // Success notification
            toast.success(`Cambiado a ${response.nombre}`);
            
            // Force page reload to update all data with new organization context
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
        } catch (err) {
            setError('Error switching organization');
            console.error('Error switching organization:', err);
            toast.error('Error al cambiar organización');
        } finally {
            setLoading(false);
        }
    };

    const updateOrganization = async (orgId, data) => {
        try {
            setIsManaging(true);
            const updated = await organizationService.updateOrganization(orgId, data);
            
            // Update in local state
            setOrganizations(prev => 
                prev.map(org => org.id === orgId ? updated : org)
            );
            
            if (currentOrganization?.id === orgId) {
                setCurrentOrganization(updated);
            }
            
            toast.success('Organización actualizada');
            return updated;
        } catch (err) {
            console.error('Error updating organization:', err);
            toast.error('Error al actualizar organización');
            throw err;
        } finally {
            setIsManaging(false);
        }
    };

    const createOrganization = async (data) => {
        try {
            setIsManaging(true);
            const newOrg = await organizationService.createOrganization(data);
            
            // Add to local state
            setOrganizations(prev => [...prev, newOrg]);
            
            toast.success('Organización creada exitosamente');
            return newOrg;
        } catch (err) {
            console.error('Error creating organization:', err);
            toast.error('Error al crear organización');
            throw err;
        } finally {
            setIsManaging(false);
        }
    };

    const inviteMember = async (email, role = 'MEMBER') => {
        try {
            const invitation = await organizationService.inviteMember(
                currentOrganization.id, 
                email, 
                role
            );
            toast.success(`Invitación enviada a ${email}`);
            return invitation;
        } catch (err) {
            console.error('Error inviting member:', err);
            toast.error('Error al enviar invitación');
            throw err;
        }
    };

    const removeMember = async (userId) => {
        try {
            await organizationService.removeMember(currentOrganization.id, userId);
            
            // Update local members list
            setMembers(prev => prev.filter(m => m.id !== userId));
            
            toast.success('Miembro removido');
        } catch (err) {
            console.error('Error removing member:', err);
            toast.error('Error al remover miembro');
            throw err;
        }
    };

    const updateMemberRole = async (userId, newRole) => {
        try {
            const updated = await organizationService.updateMemberRole(
                currentOrganization.id, 
                userId, 
                newRole
            );
            
            // Update local members list
            setMembers(prev => 
                prev.map(m => m.id === userId ? { ...m, organization_role: newRole } : m)
            );
            
            toast.success('Rol actualizado');
            return updated;
        } catch (err) {
            console.error('Error updating member role:', err);
            toast.error('Error al actualizar rol');
            throw err;
        }
    };

    const contextValue = {
        // Data
        organizations,
        currentOrganization,
        organizationStats,
        members,
        
        // States
        loading,
        error,
        isManaging,
        
        // Organization actions
        switchOrganization,
        updateOrganization,
        createOrganization,
        reloadOrganizations: loadOrganizations,
        
        // Member actions
        loadMembers,
        inviteMember,
        removeMember,
        updateMemberRole,
        
        // Utils
        isOwner: currentOrganization && ['OWNER', 'ADMIN'].includes(currentOrganization.user_role),
        isAdmin: currentOrganization && ['OWNER', 'ADMIN', 'MANAGER'].includes(currentOrganization.user_role),
        canManage: currentOrganization && ['OWNER', 'ADMIN'].includes(currentOrganization.user_role),
    };

    return (
        <OrganizationContext.Provider value={contextValue}>
            {children}
        </OrganizationContext.Provider>
    );
}
