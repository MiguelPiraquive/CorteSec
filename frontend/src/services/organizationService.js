import api from './api';

class OrganizationService {
    // Get current user's organizations
    async getOrganizations() {
        try {
            const response = await api.get('/api/organizations/');
            console.log('🏢 Organizations API Response:', response);
            
            // La respuesta del backend puede ser paginada o un array directo
            const organizations = response.data?.results || response.data || [];
            
            console.log('🏢 Parsed organizations:', organizations);
            return organizations;
        } catch (error) {
            console.error('❌ Error fetching organizations:', error);
            throw error;
        }
    }

    // Get current active organization
    async getCurrentOrganization() {
        try {
            const response = await api.get('/api/organizations/current/');
            console.log('🏢 Current organization API Response:', response);
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching current organization:', error);
            
            // Si no hay organización actual, intentar usar la primera de la lista
            try {
                const organizations = await this.getOrganizations();
                if (organizations && organizations.length > 0) {
                    const firstOrg = organizations[0];
                    console.log('🏢 Using first organization as fallback:', firstOrg);
                    localStorage.setItem('currentOrganization', JSON.stringify(firstOrg));
                    return firstOrg;
                }
            } catch (fallbackError) {
                console.error('❌ Error in fallback:', fallbackError);
            }
            
            return null;
        }
    }

    // Switch active organization
    async switchOrganization(organizationId) {
        try {
            const response = await api.post('/api/organizations/switch/', {
                organization_id: organizationId
            });
            return response.data;
        } catch (error) {
            console.error('Error switching organization:', error);
            throw error;
        }
    }

    // Create new organization
    async createOrganization(data) {
        try {
            const response = await api.post('/api/organizations/', data);
            return response.data;
        } catch (error) {
            console.error('Error creating organization:', error);
            throw error;
        }
    }

    // Update organization
    async updateOrganization(orgId, data) {
        try {
            const response = await api.patch(`/api/organizations/${orgId}/`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating organization:', error);
            throw error;
        }
    }

    // Delete organization
    async deleteOrganization(orgId) {
        try {
            const response = await api.delete(`/api/organizations/${orgId}/`);
            return response.data;
        } catch (error) {
            console.error('Error deleting organization:', error);
            throw error;
        }
    }

    // Get organization statistics
    async getOrganizationStats(orgId) {
        try {
            const response = await api.get(`/api/organizations/${orgId}/stats/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching organization stats:', error);
            throw error;
        }
    }

    // Get organization members
    async getOrganizationMembers(orgId) {
        try {
            const response = await api.get(`/api/organizations/${orgId}/members/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching organization members:', error);
            throw error;
        }
    }

    // Invite member to organization
    async inviteMember(orgId, email, role = 'MEMBER') {
        try {
            const response = await api.post(`/api/organizations/${orgId}/invite/`, {
                email,
                role
            });
            return response.data;
        } catch (error) {
            console.error('Error inviting member:', error);
            throw error;
        }
    }

    // Remove member from organization
    async removeMember(orgId, userId) {
        try {
            const response = await api.delete(`/api/organizations/${orgId}/members/${userId}/`);
            return response.data;
        } catch (error) {
            console.error('Error removing member:', error);
            throw error;
        }
    }

    // Update member role
    async updateMemberRole(orgId, userId, role) {
        try {
            const response = await api.patch(`/api/organizations/${orgId}/members/${userId}/`, {
                role
            });
            return response.data;
        } catch (error) {
            console.error('Error updating member role:', error);
            throw error;
        }
    }

    // Get organization activity log
    async getOrganizationActivity(orgId, limit = 10) {
        try {
            const response = await api.get(`/api/organizations/${orgId}/activity/?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching organization activity:', error);
            throw error;
        }
    }

    // Accept organization invitation
    async acceptInvitation(token) {
        try {
            const response = await api.post('/api/organizations/accept-invitation/', {
                token
            });
            return response.data;
        } catch (error) {
            console.error('Error accepting invitation:', error);
            throw error;
        }
    }

    // Get organization settings
    async getOrganizationSettings(orgId) {
        try {
            const response = await api.get(`/api/organizations/${orgId}/settings/`);
            return response.data;
        } catch (error) {
            console.error('Error fetching organization settings:', error);
            throw error;
        }
    }

    // Update organization settings
    async updateOrganizationSettings(orgId, settings) {
        try {
            const response = await api.patch(`/api/organizations/${orgId}/settings/`, settings);
            return response.data;
        } catch (error) {
            console.error('Error updating organization settings:', error);
            throw error;
        }
    }
}

export default new OrganizationService();
