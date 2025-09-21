import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Smartphone, Check, AlertCircle } from 'lucide-react';

interface PaymentPageProps {
  bookingData: any;
  onBack: () => void;
  onPaymentSuccess: (paymentData: any) => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ bookingData, onBack, onPaymentSuccess }) => {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const paymentMethods = [
    {
      id: 'tmoney',
      name: 'TMoney',
      logo: '🏦',
      color: 'bg-blue-100 border-blue-300',
      selectedColor: 'bg-blue-500'
    },
    {
      id: 'flooz',
      name: 'Flooz',
      logo: '💳',
      color: 'bg-purple-100 border-purple-300',
      selectedColor: 'bg-purple-500'
    },
    {
      id: 'mtn',
      name: 'MTN MoMo',
      logo: '📱',
      color: 'bg-yellow-100 border-yellow-300',
      selectedColor: 'bg-yellow-500'
    },
    {
      id: 'wave',
      name: 'Wave',
      logo: '🌊',
      color: 'bg-green-100 border-green-300',
      selectedColor: 'bg-green-500'
    }
  ];

  const handlePayment = async () => {
    if (!selectedMethod || !phoneNumber) return;

    setProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      onPaymentSuccess({
        ...bookingData,
        paymentMethod: selectedMethod,
        phoneNumber,
        paymentId: `PAY-${Date.now()}`,
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      });
    }, 3000);
  };

  const totalAmount = bookingData.trip.price;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-6 h-6 mr-2 text-blue-600" />
                Choisissez votre méthode de paiement
              </h2>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${selectedMethod === method.id 
                        ? `${method.selectedColor} text-white border-transparent` 
                        : `${method.color} hover:border-opacity-60`
                      }
                    `}
                  >
                    <div className="text-2xl mb-2">{method.logo}</div>
                    <div className="font-medium text-sm">{method.name}</div>
                  </button>
                ))}
              </div>

              {/* Phone Number Input */}
              {selectedMethod && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Smartphone className="w-4 h-4 inline mr-1" />
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+228 XX XX XX XX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Payment Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Instructions de paiement :</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Vous recevrez une notification sur votre téléphone</li>
                          <li>• Confirmez le paiement de {totalAmount.toLocaleString()} CFA</li>
                          <li>• Le billet sera généré après confirmation</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handlePayment}
                    disabled={!phoneNumber || processing}
                    className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Payer {totalAmount.toLocaleString()} CFA
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Booking Summary */}
          <div className="bg-white rounded-xl shadow-md border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Récapitulatif de la réservation</h2>
            
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Détails du voyage</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trajet</span>
                    <span>{bookingData.trip.departure} → {bookingData.trip.arrival}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span>{new Date(bookingData.searchData.date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heure</span>
                    <span>{bookingData.trip.departureTime} - {bookingData.trip.arrivalTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Compagnie</span>
                    <span>{bookingData.trip.company}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Siège</span>
                    <span>N° {bookingData.selectedSeat}</span>
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Passager</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nom</span>
                    <span>{bookingData.passengerInfo.firstName} {bookingData.passengerInfo.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Téléphone</span>
                    <span>{bookingData.passengerInfo.phone}</span>
                  </div>
                  {bookingData.passengerInfo.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email</span>
                      <span>{bookingData.passengerInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total à payer</span>
                  <span className="text-green-600">{totalAmount.toLocaleString()} CFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentPage;