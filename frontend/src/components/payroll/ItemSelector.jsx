/**
 * Selector de Items de Construcción
 * Componente para seleccionar items de producción
 */

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { itemsAPI } from '../../services/payrollService';

const ItemSelector = ({ 
  value, 
  onChange, 
  label,
  required = false,
  disabled = false 
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await itemsAPI.activos();
      const data = response.results || response;
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar items:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === value);

  const filteredItems = items.filter(i => 
    i.nombre.toLowerCase().includes(search.toLowerCase()) ||
    i.codigo.toLowerCase().includes(search.toLowerCase())
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
          {selectedItem ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">{selectedItem.codigo}</span>
                <span className="text-gray-600 ml-2">- {selectedItem.nombre}</span>
                {selectedItem.unidad_medida && (
                  <span className="text-sm text-gray-500 ml-2">({selectedItem.unidad_medida})</span>
                )}
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
              {loading ? 'Cargando...' : 'Seleccionar item de construcción'}
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
                  placeholder="Buscar item..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="overflow-y-auto max-h-48">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors
                      ${item.id === value ? 'bg-blue-100' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div>
                          <span className="font-medium text-gray-900">{item.codigo}</span>
                          <span className="text-gray-600 ml-2">- {item.nombre}</span>
                        </div>
                        {item.descripcion && (
                          <div className="text-xs text-gray-500 mt-1">{item.descripcion}</div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        {item.unidad_medida && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {item.unidad_medida}
                          </span>
                        )}
                        {item.precio_unitario && (
                          <div className="text-xs text-gray-600 mt-1">
                            ${parseFloat(item.precio_unitario).toLocaleString('es-CO')}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  No se encontraron items
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

export default ItemSelector;
