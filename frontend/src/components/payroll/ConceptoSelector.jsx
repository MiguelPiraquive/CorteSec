/**
 * Selector de Conceptos Laborales
 * Componente para seleccionar devengados o deducciones
 */

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import conceptosLaboralesService from '../../services/conceptosLaboralesService';

const ConceptoSelector = ({ 
  tipo = 'DEV', // 'DEV' o 'DED'
  value, 
  onChange, 
  label,
  required = false,
  disabled = false 
}) => {
  const [conceptos, setConceptos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadConceptos();
  }, [tipo]);

  const loadConceptos = async () => {
    setLoading(true);
    try {
      let data;
      if (tipo === 'DEV') {
        const response = await conceptosLaboralesService.getDevengadosParaSelector();
        data = response.results || response;
      } else {
        const response = await conceptosLaboralesService.getDeduccionesParaSelector();
        data = response.results || response;
      }
      setConceptos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar conceptos:', error);
      setConceptos([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedConcepto = conceptos.find(c => c.id === value);

  const filteredConceptos = conceptos.filter(c => 
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-2 text-left bg-white border rounded-lg shadow-sm 
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}
            ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
        >
          {selectedConcepto ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{selectedConcepto.codigo}</span>
                <span className="text-gray-600 ml-2">- {selectedConcepto.nombre}</span>
              </div>
              {!disabled && (
                <X 
                  className="w-4 h-4 text-gray-400 hover:text-gray-600" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              )}
            </div>
          ) : (
            <span className="text-gray-400">
              {loading ? 'Cargando...' : `Seleccionar ${tipo === 'DEV' ? 'devengado' : 'deducción'}`}
            </span>
          )}
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar concepto..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="overflow-y-auto max-h-48">
              {filteredConceptos.length > 0 ? (
                filteredConceptos.map(concepto => (
                  <button
                    key={concepto.id}
                    type="button"
                    onClick={() => {
                      onChange(concepto.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors
                      ${concepto.id === value ? 'bg-blue-100' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">{concepto.codigo}</span>
                        <span className="text-gray-600 ml-2">- {concepto.nombre}</span>
                      </div>
                      {concepto.es_salarial && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Salarial
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  No se encontraron conceptos
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ConceptoSelector;
