import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, DollarSign, Bus, AlertCircle, CheckCircle } from 'lucide-react';
import apiService from '../services/api';
import { City, Trip as SharedTrip } from '../types';

interface AddTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: SharedTrip) => void;
  editingTrip: SharedTrip | null;
  companyId: string | number;
  cities?: City[];
}

const AddTripModal: React.FC<AddTripModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTrip,
  companyId,
  cities: propCities
}) => {
  // Helper pour calculer la durée en minutes (gère le lendemain)
  const computeDurationMinutes = (dep: string, arr: string) => {
    if (!dep || !arr) return 0;
    const depTime = new Date(`2000-01-01T${dep}`);
    const arrTime = new Date(`2000-01-01T${arr}`);
    if (arrTime < depTime) {
      arrTime.setDate(arrTime.getDate() + 1);
    }
    const diffMs = arrTime.getTime() - depTime.getTime();
    return Math.round(diffMs / (1000 * 60));
  };

  const [formData, setFormData] = useState({
    companyId: editingTrip?.companyId || companyId,
    departureCity: editingTrip?.departureCity || '',
    arrivalCity: editingTrip?.arrivalCity || '',
    departureTime: editingTrip?.departureTime || '',
    arrivalTime: editingTrip?.arrivalTime || '',
    price: editingTrip?.price || 0,
    duration: editingTrip?.duration || 0,
    busType: editingTrip?.busType || 'Standard',
    capacity: editingTrip?.capacity || 50,
    isActive: editingTrip?.isActive ?? true,
    date: (editingTrip as any)?.date || ''
  });

  // Stops state: array of { id?, city, sequence, segment_price }
  const [stops, setStops] = useState<Array<any>>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const busTypes = [
    { value: 'Standard', label: 'Standard' },
    { value: 'Premium', label: 'Premium' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Luxury', label: 'Luxury' }
  ];

  // const cities = [
  //   // fallback static list if `cities` prop is not provided
  //   'Lomé', 'Kara', 'Kpalimé', 'Sokodé', 'Atakpamé', 'Dapaong', 'Tsévié', 'Aného', 'Bassar', 'Mango'
  // ];

  useEffect(() => {
    if (editingTrip) {
      setFormData({
        companyId: editingTrip.companyId ?? companyId,
        departureCity: editingTrip.departureCity ?? '',
        arrivalCity: editingTrip.arrivalCity ?? '',
        departureTime: editingTrip.departureTime ?? '',
        arrivalTime: editingTrip.arrivalTime ?? '',
        price: editingTrip.price ?? 0,
        duration: editingTrip.duration ?? 0,
        busType: editingTrip.busType ?? 'Standard',
        capacity: editingTrip.capacity ?? 50,
        isActive: editingTrip.isActive ?? true,
        date: (editingTrip as any).date ?? ''
      });
      // load stops if provided on editingTrip
      const providedStops = (editingTrip as any).stops || [];
      if (providedStops && Array.isArray(providedStops)) {
        setStops(providedStops.map((s: any, idx: number) => ({
          id: s.id,
          city: s.city || s.city_id || s.cityId || s.cityId,
          sequence: s.sequence ?? idx,
          segment_price: s.segment_price != null ? Number(s.segment_price) : null
        })));
      }
    }
  }, [editingTrip]);

  useEffect(() => {
    // initialize stops when modal opens and no editingTrip
    if (!editingTrip && isOpen) {
      setStops([]);
    }
  }, [isOpen, editingTrip]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue: any = (type === 'checkbox')
      ? (e.target as HTMLInputElement).checked
      : (e.target as HTMLSelectElement).tagName === 'SELECT' && name.match(/City/i)
        ? (value === '' ? '' : Number(value))
        : (type === 'number' ? parseFloat(value) || 0 : value);

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
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
      const minutes = computeDurationMinutes(formData.departureTime, formData.arrivalTime);
      setFormData(prev => ({
        ...prev,
        duration: minutes
      }));
    }
  };

  const addStop = () => {
    const nextSeq = stops.length > 0 ? Math.max(...stops.map(s => s.sequence)) + 1 : 0;
    setStops(prev => [...prev, { city: '', sequence: nextSeq, segment_price: null }]);
  };

  const updateStop = (index: number, patch: Partial<any>) => {
    setStops(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  const removeStop = (index: number) => {
    setStops(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      // re-sequence
      return copy.map((s, i) => ({ ...s, sequence: i }));
    });
  };

  const moveStop = (index: number, dir: number) => {
    setStops(prev => {
      const copy = [...prev];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= copy.length) return prev;
      const tmp = copy[newIndex];
      copy[newIndex] = copy[index];
      copy[index] = tmp;
      return copy.map((s, i) => ({ ...s, sequence: i }));
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // if (!formData.companyId) {
    //   newErrors.companyId = 'Veuillez sélectionner une compagnie';
    // }

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

    if (!formData.date) {
      newErrors.date = 'La date du trajet est requise';
    }

    // Calculer et valider que la durée est strictement positive (en minutes)
    const minutes = computeDurationMinutes(formData.departureTime, formData.arrivalTime);
    if (minutes <= 0) {
      newErrors.arrivalTime = 'La durée du trajet doit être supérieure à 0 minute';
    } else {
      // synchroniser la durée calculée
      if (formData.duration !== minutes) {
        setFormData(prev => ({ ...prev, duration: minutes }));
      }
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
    
    // s'assurer que la durée est calculée correctement juste avant l'envoi
    const minutes = computeDurationMinutes(formData.departureTime, formData.arrivalTime);
    if (minutes !== formData.duration) {
      setFormData(prev => ({ ...prev, duration: minutes }));
    }
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    // Préparer payload normalisé attendu par l'API (durée en minutes)
    const payload: any = {
      company: formData.companyId ? Number(formData.companyId) : null,
      departure_city: formData.departureCity ? Number(formData.departureCity) : null,
      arrival_city: formData.arrivalCity ? Number(formData.arrivalCity) : null,
      departure_time: formData.departureTime,
      arrival_time: formData.arrivalTime,
      date: formData.date,
      price: Number(formData.price),
      duration: Number(minutes),
      bus_type: formData.busType,
      capacity: Number(formData.capacity),
      is_active: Boolean(formData.isActive),
    };

    // include stops if any
    if (stops && stops.length > 0) {
      payload.stops = stops.map(s => ({
        id: s.id,
        city: s.city ? Number(s.city) : null,
        sequence: Number.isFinite(Number(s.sequence)) ? Number(s.sequence) : 0,
        segment_price: s.segment_price != null ? Number(s.segment_price) : null
      }));
    }

    // Simuler requête API locale (AdminDashboard appellera apiService)
    // setTimeout(() => {
    //   setIsLoading(false);
    //   onSave(payload as any);
    //   onClose();
    // }, 300);

    try {
      if (editingTrip) {
        const updated = await apiService.updateTrip(Number(editingTrip.id), payload);
        onSave({ ...editingTrip, ...updated } as any);
      } else {
        const created = await apiService.createTrip(payload as any);
        onSave(created as any);
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du trajet:', error);
    } finally {
      setIsLoading(false);
    }
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
      isActive: true,
      date: ''
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
                {/* Use provided cities prop when available */}
                { propCities && propCities.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  )) }
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
                { propCities && propCities.filter((c: any) => String(c.id) !== String(formData.departureCity)).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  )) }
              </select>
              {errors.arrivalCity && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.arrivalCity}
                </p>
              )}
            </div>

            {/* Date du trajet */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date du trajet *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date || ''}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.date}
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

          {/* Stops editor */}
          <div className="md:col-span-2 bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Arrêts / Escales</h3>
              <button type="button" onClick={addStop} className="text-sm px-3 py-1 bg-blue-600 text-white rounded">Ajouter un arrêt</button>
            </div>

            {stops.length === 0 && (
              <p className="text-sm text-gray-500">Aucun arrêt défini. Les trajets sans arrêts seront traités comme parcours direct.</p>
            )}

            <div className="space-y-3">
              {stops.map((s, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <label className="text-sm text-gray-700">Ville</label>
                    <select value={s.city || ''} onChange={(e) => updateStop(idx, { city: e.target.value })} className="w-full px-2 py-2 border rounded">
                      <option value="">Sélectionner une ville</option>
                      { propCities && propCities.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      )) }
                    </select>
                  </div>

                  <div className="col-span-4">
                    <label className="text-sm text-gray-700">Prix du segment</label>
                    <input type="number" value={s.segment_price ?? ''} onChange={(e) => updateStop(idx, { segment_price: e.target.value === '' ? null : Number(e.target.value) })} className="w-full px-2 py-2 border rounded" placeholder="0" />
                  </div>

                  <div className="col-span-3 flex items-end space-x-2">
                    <button type="button" onClick={() => moveStop(idx, -1)} className="px-2 py-1 bg-gray-100 rounded">▲</button>
                    <button type="button" onClick={() => moveStop(idx, 1)} className="px-2 py-1 bg-gray-100 rounded">▼</button>
                    <button type="button" onClick={() => removeStop(idx)} className="px-2 py-1 bg-red-100 text-red-700 rounded">Suppr</button>
                  </div>
                </div>
              ))}
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
