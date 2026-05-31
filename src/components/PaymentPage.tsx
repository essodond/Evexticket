import React, { useMemo, useState } from 'react';
import apiService from '../services/api';
import type { QosOperator } from '../services/api';
import type { BookingData, PaymentData } from '../types';

interface PaymentPageProps {
  bookingData: BookingData;
  onBack: () => void;
  onPaymentSuccess: (data: PaymentData) => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ bookingData, onBack, onPaymentSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<QosOperator>('flooz');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { trip, selectedSeat, passengerInfo, searchData } = bookingData || {};

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    const simple = /^\d{2}:\d{2}(:\d{2})?$/;
    if (simple.test(timeStr)) {
      const [h, m] = timeStr.split(':');
      return `${h}:${m}`;
    }
    try {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
    return String(timeStr);
  };

  const formatDuration = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return '-';
    const minutes = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (isNaN(minutes)) return String(value);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `${m} min`;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  };

  const priceNum = useMemo(() => {
    const p = trip?.price;
    return typeof p === 'number' ? p : parseFloat(String(p));
  }, [trip]);

  const displayDeparture = trip?.departure_city_name || trip?.departure || searchData?.departure || '-';
  const displayArrival = trip?.arrival_city_name || trip?.arrival || searchData?.arrival || '-';
  const displayCompany = trip?.company_name || (trip?.company !== undefined ? String(trip.company) : '-');
  const displayDateStr = searchData?.date || searchData?.travel_date;
  const displayDate = displayDateStr ? new Date(displayDateStr).toLocaleDateString('fr-FR') : '-';

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForPaymentConfirmation = async (reference: string) => {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const verification = await apiService.verifyQosPayment(reference);
      if (verification.paye || verification.statut === 'paye') return verification;
      if (verification.statut === 'echoue' || verification.statut === 'expire') {
        throw new Error(verification.message || 'Le paiement a echoue ou a expire.');
      }
      setStatusMessage('Paiement en attente de confirmation sur votre telephone...');
      await wait(5000);
    }
    throw new Error('Paiement initie, mais la confirmation QOS prend trop de temps. Verifiez le statut dans quelques instants.');
  };

  const handlePayment = async () => {
    if (!bookingData || !trip || !selectedSeat || !passengerInfo) return;
    if (!phoneNumber) {
      setApiError('Veuillez saisir le numero de telephone Mobile Money.');
      return;
    }
    setLoading(true);
    setStatusMessage('Initialisation du paiement QOS...');
    setApiError(null);

    try {
      const scheduledTripId = Number(trip?.scheduled_trip_id ?? trip?.id ?? trip?.trip_id ?? trip);
      if (!scheduledTripId || Number.isNaN(scheduledTripId)) {
        throw new Error('Impossible d identifier le voyage a payer.');
      }

      const passengerName = `${passengerInfo.firstName || ''} ${passengerInfo.lastName || ''}`.trim();
      const initiated = await apiService.initiateQosPayment({
        voyage_id: scheduledTripId,
        numero_siege: selectedSeat,
        client_nom: passengerName,
        client_telephone: phoneNumber || passengerInfo.phone,
        montant_billet: Math.round(priceNum),
        operateur: paymentMethod,
        ville_depart: displayDeparture,
        ville_arrivee: displayArrival,
      });

      setStatusMessage('Paiement lance. Confirmez la demande sur votre telephone.');
      const confirmed = await waitForPaymentConfirmation(initiated.reference_evex);

      onPaymentSuccess({
        transactionId: initiated.transaction_id,
        paymentId: initiated.reference_evex,
        paymentMethod,
        phoneNumber,
        selectedSeat,
        trip,
        searchData,
        passengerInfo,
        qosReference: initiated.reference_evex,
        paymentStatus: confirmed.statut,
        amountTotal: confirmed.montant_total,
        booking: {
          id: initiated.reference_evex,
          status: confirmed.statut,
        },
      });
    } catch (error: any) {
      const errMsg = error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || 'Une erreur est survenue lors du paiement.');
      setApiError(errMsg);
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
              <span className="mr-2">&larr;</span>
              Retour
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TogoBus</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recapitulatif du trajet</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Compagnie</span>
                  <span className="font-medium">{displayCompany}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trajet</span>
                  <span className="font-medium">{displayDeparture} - {displayArrival}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{displayDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Heure</span>
                  <span className="font-medium">{formatTime(trip?.departure_time)} - {formatTime(trip?.arrival_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duree</span>
                  <span className="font-medium">{formatDuration(trip?.duration)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Prix par personne</span>
                    <span className="font-bold text-green-600">{!isNaN(priceNum) ? priceNum.toLocaleString('fr-FR') : '-'} CFA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Methode de paiement</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="payment" value="flooz" checked={paymentMethod === 'flooz'} onChange={() => setPaymentMethod('flooz')} />
                    <span>Flooz</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="payment" value="tmoney" checked={paymentMethod === 'tmoney'} onChange={() => setPaymentMethod('tmoney')} />
                    <span>Mixx by Yas</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero Mobile Money *</label>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="+228 XX XX XX XX" />
                </div>

                {statusMessage && (
                  <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">{statusMessage}</div>
                )}

                {apiError && (
                  <div className="mt-3 text-sm text-red-600">{apiError}</div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={loading || !phoneNumber}
                  className="w-full mt-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Traitement QOS...' : 'Payer avec QOS'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Details du passager</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Nom</span>
                <span className="font-medium">{`${passengerInfo?.firstName || ''} ${passengerInfo?.lastName || ''}`.trim() || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Telephone</span>
                <span className="font-medium">{passengerInfo?.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-medium">{passengerInfo?.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Siege</span>
                <span className="font-medium">{selectedSeat || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;
