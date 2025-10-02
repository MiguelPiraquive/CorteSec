import { useContext } from 'react';
import { OrganizationContext } from '../contexts/OrganizationContext';

/**
 * Hook para usar el contexto de organizaciones
 * @returns {Object} Contexto de organizaciones con todos los métodos y estados
 */
export const useOrganizations = () => {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error('useOrganizations debe ser usado dentro de un OrganizationProvider');
  }
  
  return context;
};

export default useOrganizations;
