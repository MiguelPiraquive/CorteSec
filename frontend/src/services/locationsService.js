import { apiRequest } from './api';

// Upload Excel for departamentos/municipios
export const importLocationsExcel = async (file) => {
  const formData = new FormData();
  formData.append('excel', file);
  return apiRequest('/api/locations/import-excel/', {
    method: 'POST',
    body: formData,
    // Important: Let browser set Content-Type with boundary
    headers: {
      // We'll merge auth and CSRF in apiRequest; ensure not to force JSON
    },
  });
};

export default {
  importLocationsExcel,
};
