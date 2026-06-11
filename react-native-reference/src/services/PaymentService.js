import Constants from 'expo-constants';

const expoApiBaseUrl =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_API_BASE_URL;
const API_BASE_URL =
  expoApiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'https://api.evex-tg.com/api';

async function handleResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail || data?.error || JSON.stringify(data) || `Erreur HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export async function initiatePayment({ method, phone, amount, firstname, lastname }) {
  // React Native appelle uniquement Django. Les identifiants QosPay restent cote backend.
  const response = await fetch(`${API_BASE_URL}/payments/pay/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method,
      phone,
      amount,
      firstname,
      lastname,
    }),
  });

  return handleResponse(response);
}

export async function getTransactionStatus(transref) {
  // Verification du statut via Django, jamais directement via QosPay.
  const response = await fetch(`${API_BASE_URL}/payments/status/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transref }),
  });

  return handleResponse(response);
}

export default {
  initiatePayment,
  getTransactionStatus,
};
