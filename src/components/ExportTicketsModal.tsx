import React, { useState } from 'react';
// EXPORT TICKETS MODAL
// Ce composant affiche une interface pour configurer et lancer l'export
// des tickets (PDF/Excel). Il ne gère pas l'export côté serveur directement
// : il émet `onExport(format, filters)` vers le parent qui fera l'appel API.
import { X, Download, FileText, Table, Calendar, Filter } from 'lucide-react';

interface ExportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'excel', filters: ExportFilters) => void;
}

interface ExportFilters {
  dateFrom: string;
  dateTo: string;
  companyId: string;
  status: 'all' | 'confirmed' | 'pending' | 'cancelled';
  includePassengerDetails: boolean;
  includePaymentDetails: boolean;
}

const ExportTicketsModal: React.FC<ExportTicketsModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport 
}) => {
  const [filters, setFilters] = useState<ExportFilters>({
    dateFrom: '',
    dateTo: '',
    companyId: '',
    status: 'all',
    includePassengerDetails: true,
    includePaymentDetails: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf');

  // Données simulées pour les compagnies
  const companies = [
    { id: '1', name: 'TogoBus Express' },
    { id: '2', name: 'Lomé Transport' },
    { id: '3', name: 'Kara Lines' },
    { id: '4', name: 'Togo Trans' }
  ];

  const handleFilterChange = (key: keyof ExportFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    setIsLoading(true);
    
    // Simuler l'export
    setTimeout(() => {
      setIsLoading(false);
      onExport(selectedFormat, filters);
      onClose();
    }, 2000);
  };

  const handleClose = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      companyId: '',
      status: 'all',
      includePassengerDetails: true,
      includePaymentDetails: true
    });
    setSelectedFormat('pdf');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Download className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900">
              Exporter les tickets
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format d'export */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Format d'export
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedFormat('pdf')}
                className={`p-4 border-2 rounded-lg transition-colors flex items-center justify-center ${
                  selectedFormat === 'pdf'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FileText className="w-6 h-6 mr-2" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedFormat('excel')}
                className={`p-4 border-2 rounded-lg transition-colors flex items-center justify-center ${
                  selectedFormat === 'excel'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Table className="w-6 h-6 mr-2" />
                Excel
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Filter className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
            </div>

            {/* Période */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de début
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date de fin
                </label>
                <input
                  type="date"
                  id="dateTo"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Compagnie */}
            <div>
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                Compagnie
              </label>
              <select
                id="companyId"
                value={filters.companyId}
                onChange={(e) => handleFilterChange('companyId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les compagnies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Statut */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Statut des tickets
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="confirmed">Confirmés</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulés</option>
              </select>
            </div>

            {/* Options d'inclusion */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Inclure dans l'export :</h4>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includePassengerDetails}
                  onChange={(e) => handleFilterChange('includePassengerDetails', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Détails des passagers
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includePaymentDetails}
                  onChange={(e) => handleFilterChange('includePaymentDetails', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Détails de paiement
                </span>
              </label>
            </div>
          </div>

          {/* Aperçu des filtres */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Aperçu de l'export :</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• Format: {selectedFormat.toUpperCase()}</p>
              <p>• Période: {filters.dateFrom && filters.dateTo 
                ? `${filters.dateFrom} au ${filters.dateTo}` 
                : 'Toutes les dates'}</p>
              <p>• Compagnie: {filters.companyId 
                ? companies.find(c => c.id === filters.companyId)?.name 
                : 'Toutes'}</p>
              <p>• Statut: {filters.status === 'all' ? 'Tous' : filters.status}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportTicketsModal;
