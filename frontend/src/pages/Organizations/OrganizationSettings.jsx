import React, { useState, useEffect } from 'react';
import { useOrganizations } from '../../hooks/useOrganizations';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const OrganizationSettings = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        currentOrganization,
        updateOrganization,
        isManaging,
        canManage,
        isOwner
    } = useOrganizations();

    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        nombre: '',
        codigo: '',
        descripcion: '',
        tipo: '',
        email: '',
        telefono: '',
        direccion: '',
        ciudad: '',
        pais: '',
        sitio_web: '',
        activo: true,
        configuracion: {}
    });

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    useEffect(() => {
        if (currentOrganization) {
            setFormData({
                nombre: currentOrganization.nombre || '',
                codigo: currentOrganization.codigo || '',
                descripcion: currentOrganization.descripcion || '',
                tipo: currentOrganization.tipo || '',
                email: currentOrganization.email || '',
                telefono: currentOrganization.telefono || '',
                direccion: currentOrganization.direccion || '',
                ciudad: currentOrganization.ciudad || '',
                pais: currentOrganization.pais || 'Colombia',
                sitio_web: currentOrganization.sitio_web || '',
                activo: currentOrganization.activo ?? true,
                configuracion: currentOrganization.configuracion || {}
            });
            setLogoPreview(currentOrganization.logo);
        }
    }, [currentOrganization]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!canManage) {
            toast.error('No tienes permisos para modificar esta organización');
            return;
        }

        try {
            const updateData = { ...formData };
            
            // Handle logo upload if there's a new file
            if (logoFile) {
                const formDataUpload = new FormData();
                formDataUpload.append('logo', logoFile);
                // Add logo upload logic here
                // updateData.logo = uploadedLogoUrl;
            }

            await updateOrganization(currentOrganization.id, updateData);
            toast.success('Organización actualizada exitosamente');
        } catch (error) {
            toast.error('Error al actualizar la organización');
        }
    };

    const tabs = [
        {
            id: 'general',
            name: 'General',
            icon: 'fas fa-info-circle',
            enabled: true
        },
        {
            id: 'contact',
            name: 'Contacto',
            icon: 'fas fa-address-book',
            enabled: true
        },
        {
            id: 'branding',
            name: 'Marca',
            icon: 'fas fa-palette',
            enabled: canManage
        },
        {
            id: 'security',
            name: 'Seguridad',
            icon: 'fas fa-shield-alt',
            enabled: isOwner
        },
        {
            id: 'advanced',
            name: 'Avanzado',
            icon: 'fas fa-cogs',
            enabled: isOwner
        }
    ].filter(tab => tab.enabled);

    if (!currentOrganization) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                        <i className="fas fa-building text-gray-400 text-3xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Organización no encontrada
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        No se pudo cargar la información de la organización
                    </p>
                    <button
                        onClick={() => navigate('/organizations')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Volver a Organizaciones
                    </button>
                </div>
            </div>
        );
    }

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
                        No tienes permisos para acceder a la configuración de esta organización
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
                                        Configuración de la Organización
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                                        {currentOrganization.nombre} • {currentOrganization.codigo}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => navigate('/organizations/dashboard')}
                                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isManaging}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isManaging ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i>
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
                    
                    {/* Sidebar Navigation */}
                    <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left ${
                                        activeTab === tab.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'text-gray-900 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <i className={`${tab.icon} ${
                                        activeTab === tab.id
                                            ? 'text-blue-500 dark:text-blue-400'
                                            : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                                    } flex-shrink-0 -ml-1 mr-3 text-base`}></i>
                                    <span className="truncate">{tab.name}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
                        <form onSubmit={handleSubmit}>
                            
                            {/* General Tab */}
                            {activeTab === 'general' && (
                                <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
                                    <div className="md:grid md:grid-cols-3 md:gap-6">
                                        <div className="md:col-span-1">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                                Información General
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Datos básicos de identificación de la organización.
                                            </p>
                                        </div>
                                        <div className="mt-5 md:mt-0 md:col-span-2">
                                            <div className="grid grid-cols-6 gap-6">
                                                <div className="col-span-6 sm:col-span-4">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Nombre de la Organización
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="nombre"
                                                        value={formData.nombre}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        required
                                                    />
                                                </div>

                                                <div className="col-span-6 sm:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Código
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="codigo"
                                                        value={formData.codigo}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        required
                                                    />
                                                </div>

                                                <div className="col-span-6">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Descripción
                                                    </label>
                                                    <textarea
                                                        name="descripcion"
                                                        rows={3}
                                                        value={formData.descripcion}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="Descripción breve de la organización..."
                                                    />
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Tipo de Organización
                                                    </label>
                                                    <select
                                                        name="tipo"
                                                        value={formData.tipo}
                                                        onChange={handleInputChange}
                                                        className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                                    >
                                                        <option value="">Seleccionar tipo...</option>
                                                        <option value="empresa">Empresa</option>
                                                        <option value="corporacion">Corporación</option>
                                                        <option value="fundacion">Fundación</option>
                                                        <option value="ong">ONG</option>
                                                        <option value="gobierno">Gobierno</option>
                                                        <option value="educacion">Educación</option>
                                                        <option value="salud">Salud</option>
                                                        <option value="otro">Otro</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <div className="flex items-center">
                                                        <input
                                                            id="activo"
                                                            name="activo"
                                                            type="checkbox"
                                                            checked={formData.activo}
                                                            onChange={handleInputChange}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                                        />
                                                        <label htmlFor="activo" className="ml-2 block text-sm text-gray-900 dark:text-white">
                                                            Organización activa
                                                        </label>
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                        Las organizaciones inactivas no pueden realizar operaciones.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Contact Tab */}
                            {activeTab === 'contact' && (
                                <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
                                    <div className="md:grid md:grid-cols-3 md:gap-6">
                                        <div className="md:col-span-1">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                                Información de Contacto
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Datos de contacto y ubicación de la organización.
                                            </p>
                                        </div>
                                        <div className="mt-5 md:mt-0 md:col-span-2">
                                            <div className="grid grid-cols-6 gap-6">
                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Teléfono
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        name="telefono"
                                                        value={formData.telefono}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </div>

                                                <div className="col-span-6">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Dirección
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="direccion"
                                                        value={formData.direccion}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Ciudad
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="ciudad"
                                                        value={formData.ciudad}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        País
                                                    </label>
                                                    <select
                                                        name="pais"
                                                        value={formData.pais}
                                                        onChange={handleInputChange}
                                                        className="mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-white"
                                                    >
                                                        <option value="Colombia">Colombia</option>
                                                        <option value="Mexico">México</option>
                                                        <option value="Argentina">Argentina</option>
                                                        <option value="Chile">Chile</option>
                                                        <option value="Peru">Perú</option>
                                                        <option value="Ecuador">Ecuador</option>
                                                        <option value="Venezuela">Venezuela</option>
                                                        <option value="Brasil">Brasil</option>
                                                        <option value="Uruguay">Uruguay</option>
                                                        <option value="Paraguay">Paraguay</option>
                                                        <option value="Bolivia">Bolivia</option>
                                                        <option value="Otro">Otro</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-6">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Sitio Web
                                                    </label>
                                                    <input
                                                        type="url"
                                                        name="sitio_web"
                                                        value={formData.sitio_web}
                                                        onChange={handleInputChange}
                                                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        placeholder="https://www.ejemplo.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Branding Tab */}
                            {activeTab === 'branding' && (
                                <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
                                    <div className="md:grid md:grid-cols-3 md:gap-6">
                                        <div className="md:col-span-1">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                                Marca e Identidad
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Elementos visuales que representan tu organización.
                                            </p>
                                        </div>
                                        <div className="mt-5 md:mt-0 md:col-span-2">
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Logo de la Organización
                                                    </label>
                                                    <div className="mt-1 flex items-center space-x-5">
                                                        {logoPreview ? (
                                                            <img
                                                                src={logoPreview}
                                                                alt="Logo preview"
                                                                className="h-20 w-20 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                                                <span className="text-white text-2xl font-bold">
                                                                    {formData.nombre?.charAt(0)?.toUpperCase() || 'O'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <input
                                                                type="file"
                                                                id="logo"
                                                                accept="image/*"
                                                                onChange={handleLogoChange}
                                                                className="sr-only"
                                                            />
                                                            <label
                                                                htmlFor="logo"
                                                                className="cursor-pointer bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                            >
                                                                Cambiar Logo
                                                            </label>
                                                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                PNG, JPG, GIF hasta 10MB
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Security Tab */}
                            {activeTab === 'security' && isOwner && (
                                <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
                                    <div className="md:grid md:grid-cols-3 md:gap-6">
                                        <div className="md:col-span-1">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                                Configuración de Seguridad
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Controles de seguridad y acceso para la organización.
                                            </p>
                                        </div>
                                        <div className="mt-5 md:mt-0 md:col-span-2">
                                            <div className="space-y-6">
                                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                                                        </div>
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                                                Configuración de Seguridad
                                                            </h3>
                                                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                                                <p>
                                                                    Estas configuraciones afectan la seguridad de toda la organización.
                                                                    Solo los propietarios pueden modificar estos ajustes.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                                Autenticación de dos factores
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Requerir 2FA para todos los miembros
                                                            </p>
                                                        </div>
                                                        <button className="bg-gray-200 dark:bg-gray-700 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                                Auditoria de acceso
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Registrar todos los accesos al sistema
                                                            </p>
                                                        </div>
                                                        <button className="bg-blue-600 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                            <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between py-4">
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                                Sesiones concurrentes
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Limitar sesiones simultáneas por usuario
                                                            </p>
                                                        </div>
                                                        <button className="bg-gray-200 dark:bg-gray-700 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                                            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Advanced Tab */}
                            {activeTab === 'advanced' && isOwner && (
                                <div className="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6">
                                    <div className="md:grid md:grid-cols-3 md:gap-6">
                                        <div className="md:col-span-1">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                                Configuración Avanzada
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                Configuraciones técnicas y administrativas avanzadas.
                                            </p>
                                        </div>
                                        <div className="mt-5 md:mt-0 md:col-span-2">
                                            <div className="space-y-6">
                                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                                                    <div className="flex">
                                                        <div className="flex-shrink-0">
                                                            <i className="fas fa-exclamation-triangle text-red-400"></i>
                                                        </div>
                                                        <div className="ml-3">
                                                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                                                Zona de Peligro
                                                            </h3>
                                                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                                                <p>
                                                                    Estas acciones son irreversibles y pueden afectar
                                                                    permanentemente la organización.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                            Exportar Datos
                                                        </h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                                            Descargar una copia completa de todos los datos de la organización.
                                                        </p>
                                                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                                            <i className="fas fa-download mr-2"></i>
                                                            Exportar Datos
                                                        </button>
                                                    </div>

                                                    <div className="border border-red-200 dark:border-red-700 rounded-lg p-4">
                                                        <h4 className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                                                            Eliminar Organización
                                                        </h4>
                                                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                                                            Eliminar permanentemente esta organización y todos sus datos.
                                                            Esta acción no se puede deshacer.
                                                        </p>
                                                        <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                                            <i className="fas fa-trash mr-2"></i>
                                                            Eliminar Organización
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationSettings;
