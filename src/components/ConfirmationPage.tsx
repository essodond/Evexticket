import React, { useRef } from 'react';
// CONFIRMATION PAGE
// Page affichée après un paiement réussi. `paymentData` contient les infos
// transactionnelles (transactionId, seat, etc.). Dans une vraie app, ce composant
// peut demander au backend le billet final ou le PDF à télécharger.
import { Check, Download, Share, Calendar, MapPin, Clock, User, CreditCard } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ConfirmationPageProps {
  paymentData: any;
  onNewBooking: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ paymentData, onNewBooking }) => {
  // Generate QR Code content
  const qrCodeData = JSON.stringify({
    type: 'TogoBusTicket',
    transactionId: paymentData?.transactionId,
    bookingId: paymentData?.booking?.id || null,
    seat: paymentData?.selectedSeat,
    tripId: paymentData?.trip?.id || null,
  });

  // Normalisation des champs pour un affichage robuste
  const trip = paymentData?.trip || {};
  const searchData = paymentData?.searchData || {};

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

  const displayDeparture = trip.departure_city_name || trip.departure || searchData?.departure || trip.origin || '-';
  const displayArrival = trip.arrival_city_name || trip.arrival || searchData?.arrival || trip.destination || '-';
  const displayCompany = trip.company_name || trip.companyName || (trip.company !== undefined ? String(trip.company) : '-');
  const displayDateStr = searchData?.date || searchData?.travel_date || trip.date;
  const displayDate = displayDateStr ? new Date(displayDateStr).toLocaleDateString('fr-FR') : '-';
  const displayDepartureTime = formatTime(trip.departure_time || trip.departureTime);
  const priceNum = typeof trip.price === 'number' ? trip.price : parseFloat(String(trip.price));

  const ticketRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      const filename = `Billet-${paymentData?.booking?.id || paymentData?.transactionId || 'TogoBus'}.pdf`;
      pdf.save(filename);
    } catch (e) {
      console.error('Erreur lors de la génération du PDF:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <span className="text-xl font-bold text-gray-900">TogoBus</span>
            </div>
            <button
              onClick={onNewBooking}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nouvelle réservation
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Réservation confirmée !</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Votre billet a été généré avec succès. Présentez ce billet ou le QR code lors de votre voyage.
          </p>
        </div>

        {/* Ticket */}
        <div ref={ticketRef} className="bg-white rounded-2xl shadow-xl border overflow-hidden max-w-2xl mx-auto">
          {/* Ticket Header */}
          <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold mb-2">Billet de Transport</h2>
                <p className="text-blue-100">TogoBus - Voyage au Togo</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{paymentData.transactionId}</div>
                <div className="text-sm text-blue-100">N° Transaction</div>
              </div>
            </div>
          </div>

          {/* Ticket Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Trip Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Détails du voyage
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">De</span>
                      <span className="font-medium">{displayDeparture}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Vers</span>
                      <span className="font-medium">{displayArrival}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Date</span>
                      <span className="font-medium">{displayDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Heure</span>
                      <span className="font-medium">{displayDepartureTime}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Compagnie</span>
                      <span className="font-medium">{displayCompany}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Siège</span>
                      <span className="font-bold text-blue-600">N° {paymentData.selectedSeat}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2 text-green-600" />
                    Informations passager
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Nom</span>
                      <span className="font-medium">
                        {paymentData.passengerInfo.firstName} {paymentData.passengerInfo.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Téléphone</span>
                      <span className="font-medium">{paymentData.passengerInfo.phone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
                    Paiement
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Méthode</span>
                      <span className="font-medium capitalize">{paymentData.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Montant</span>
                      <span className="font-bold text-green-600">
                        {!isNaN(priceNum) ? priceNum.toLocaleString('fr-FR') : '-'} CFA
                      </span>
                    </div>
                  </div>
                  {paymentData?.booking?.id && (
                    <div className="text-xs text-gray-500 mt-2">Réservation ID: {paymentData.booking.id} • Statut: {paymentData.booking.status || 'créée'}</div>
                  )}
                </div>
              </div>

              {/* Right Side - QR Code */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  {/* QR Code */}
                    <div className="text-center">
                      <div className="mx-auto mb-2">
                        <QRCodeCanvas value={qrCodeData} size={128} level="H" includeMargin={true} />
                      </div>
-                      <p className="text-xs text-gray-500 font-mono break-all">{qrCodeData}</p>
+                      {/* Texte JSON du QR supprimé pour un rendu propre */}
                    </div>
                </div>
                <p className="text-sm text-gray-600 text-center max-w-48">
                  Scannez ce QR code lors de l'embarquement ou présentez ce billet
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Footer */}
          <div className="bg-gray-50 border-t px-6 py-4">
            <div className="flex flex-wrap gap-4 justify-center">
              <button onClick={handleDownload} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </button>
              <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Share className="w-4 h-4 mr-2" />
                Partager
              </button>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="max-w-2xl mx-auto mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">Informations importantes</h3>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>• Présentez-vous à la gare 30 minutes avant l'heure de départ</li>
            <li>• Munissez-vous d'une pièce d'identité valide</li>
            <li>• Ce billet est personnel et non transférable</li>
            <li>• En cas de retard ou d'annulation, contactez le 70 XX XX XX</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default ConfirmationPage;