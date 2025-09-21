import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, DollarSign, Bus, AlertCircle, CheckCircle } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

interface Trip {
  id: string;
  companyId: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  duration: number;
  busType: string;
  capacity: number;
  isActive: boolean;
}

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: Omit<Trip, 'id'>) => void;
  editingTrip?: Trip | null;
  companies: Company[];
}

const AddTripModal: React.FC<AddTripModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingTrip,
  companies 
}) => {
  const [formData, setFormData] = useState({
    companyId: editingTrip?.companyId || '',
    departureCity: editingTrip?.departureCity || '',
    arrivalCity: editingTrip?.arrivalCity || '',
    departureTime: editingTrip?.departureTime || '',
    arrivalTime: editingTrip?.arrivalTime || '',
    price: editingTrip?.price || 0,
    duration: editingTrip?.duration || 0,
    busType: editingTrip?.busType || 'Standard',
    capacity: editingTrip?.capacity || 50,
    isActive: editingTrip?.isActive ?? true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const busTypes = [
    { value: 'Standard', label: 'Standard' },
    { value: 'Premium', label: 'Premium' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Luxury', label: 'Luxury' }
  ];

  const cities = [
    'Lomé', 'Kara', 'Kpalimé', 'Sokodé', 'Atakpamé', 'Dapaong', 'Tsévié', 'Aného', 'Bassar', 'Mango'
  ];

  useEffect(() => {
    if (editingTrip) {
      setFormData({
        companyId: editingTrip.companyId,
        departureCity: editingTrip.departureCity,
        arrivalCity: editingTrip.arrivalCity,
        departureTime: editingTrip.departureTime,
        arrivalTime: editingTrip.arrivalTime,
        price: editingTrip.price,
        duration: editingTrip.duration,
        busType: editingTrip.busType,
        capacity: editingTrip.capacity,
        isActive: editingTrip.isActive
      });
    }
  }, [editingTrip]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const calculateDuration = () => {
    if (formData.departureTime && formData.arrivalTime) {
      const depTime = new Date(`2000-01-01T${formData.departureTime}`);
      const arrTime = new Date(`2000-01-01T${formData.arrivalTime}`);
      
      if (arrTime < depTime) {
        // Si l'heure d'arrivée est le lendemain
        arrTime.setDate(arrTime.getDate() + 1);
      }
      
      const diffMs = arrTime.getTime() - depTime.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      
      setFormData(prev => ({
        ...prev,
        duration: diffHours
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyId) {
      newErrors.companyId = 'Veuillez sélectionner une compagnie';
    }

    if (!formData.departureCity) {
      newErrors.departureCity = 'La ville de départ est requise';
    }

    if (!formData.arrivalCity) {
      newErrors.arrivalCity = 'La ville d\'arrivée est requise';
    }

    if (formData.departureCity === formData.arrivalCity) {
      newErrors.arrivalCity = 'La ville d\'arrivée doit être différente de la ville de départ';
    }

    if (!formData.departureTime) {
      newErrors.departureTime = 'L\'heure de départ est requise';
    }

    if (!formData.arrivalTime) {
      newErrors.arrivalTime = 'L\'heure d\'arrivée est requise';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Le prix doit être supérieur à 0';
    }

    if (formData.capacity <= 0) {
      newErrors.capacity = 'La capacité doit être supérieure à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    // Simuler une requête API
    setTimeout(() => {
      setIsLoading(false);
      onSave(formData);
      onClose();
    }, 1000);
  };

  const handleClose = () => {
    setFormData({
      companyId: '',
      departureCity: '',
      arrivalCity: '',
      departureTime: '',
      arrivalTime: '',
      price: 0,
      duration: 0,
      busType: 'Standard',
      capacity: 50,
      isActive: true
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Bus className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              {editingTrip ? 'Modifier le trajet' : 'Ajouter un trajet'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compagnie */}
            <div className="md:col-span-2">
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                Compagnie *
              </label>
              <select
                id="companyId"
                name="companyId"
                value={formData.companyId}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.companyId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une compagnie</option>
                {companies.filter(c => c.isActive).map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.companyId && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyId}
                </p>
              )}
            </div>

            {/* Ville de départ */}
            <div>
              <label htmlFor="departureCity" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Ville de départ *
              </label>
              <select
                id="departureCity"
                name="departureCity"
                value={formData.departureCity}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.departureCity ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une ville</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.departureCity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.departureCity}
                </p>
              )}
            </div>

            {/* Ville d'arrivée */}
            <div>
              <label htmlFor="arrivalCity" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Ville d'arrivée *
              </label>
              <select
                id="arrivalCity"
                name="arrivalCity"
                value={formData.arrivalCity}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.arrivalCity ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une ville</option>
                {cities.filter(city => city !== formData.departureCity).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.arrivalCity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.arrivalCity}
                </p>
              )}
            </div>

            {/* Heure de départ */}
            <div>
              <label htmlFor="departureTime" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Heure de départ *
              </label>
              <input
                type="time"
                id="departureTime"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleInputChange}
                onBlur={calculateDuration}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.departureTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.departureTime && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.departureTime}
                </p>
              )}
            </div>

            {/* Heure d'arrivée */}
            <div>
              <label htmlFor="arrivalTime" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Heure d'arrivée *
              </label>
              <input
                type="time"
                id="arrivalTime"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleInputChange}
                onBlur={calculateDuration}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.arrivalTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.arrivalTime && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.arrivalTime}
                </p>
              )}
            </div>

            {/* Prix */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Prix (FCFA) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="100"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="5000"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.price}
                </p>
              )}
            </div>

            {/* Type de bus */}
            <div>
              <label htmlFor="busType" className="block text-sm font-medium text-gray-700 mb-2">
                Type de bus
              </label>
              <select
                id="busType"
                name="busType"
                value={formData.busType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {busTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Capacité */}
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                Capacité (places)
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                min="1"
                max="100"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.capacity ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.capacity}
                </p>
              )}
            </div>

            {/* Durée calculée */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée estimée
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                {formData.duration > 0 ? `${formData.duration} heures` : 'Calcul automatique'}
              </div>
            </div>

            {/* Statut actif */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Trajet actif
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingTrip ? 'Modification...' : 'Création...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingTrip ? 'Modifier' : 'Créer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTripModal;
