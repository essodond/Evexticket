import { Trip } from '../types';

export const mockTrips: Trip[] = [
  {
    id: '1',
    company: 'STIF Transport',
    from: 'Lomé',
    to: 'Kara',
    departure: '08:00',
    arrival: '14:30',
    price: 8500,
    seatsLeft: 12,
    date: '2025-10-27',
  },
  {
    id: '2',
    company: 'RAKIETA Voyages',
    from: 'Lomé',
    to: 'Sokodé',
    departure: '09:30',
    arrival: '14:00',
    price: 6500,
    seatsLeft: 8,
    date: '2025-10-27',
  },
  {
    id: '3',
    company: 'TCV Express',
    from: 'Lomé',
    to: 'Atakpamé',
    departure: '10:00',
    arrival: '12:30',
    price: 4000,
    seatsLeft: 15,
    date: '2025-10-27',
  },
  {
    id: '4',
    company: 'STIF Transport',
    from: 'Lomé',
    to: 'Dapaong',
    departure: '07:00',
    arrival: '16:00',
    price: 12000,
    seatsLeft: 5,
    date: '2025-10-27',
  },
  {
    id: '5',
    company: 'RAKIETA Voyages',
    from: 'Lomé',
    to: 'Kpalimé',
    departure: '11:00',
    arrival: '13:00',
    price: 3500,
    seatsLeft: 20,
    date: '2025-10-27',
  },
];

export const formatCurrency = (amount: number | undefined | null): string => {
  if (typeof amount !== 'number') {
    return '0 FCFA'; // Ou 'N/A FCFA' selon la préférence
  }
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};

export const formatTime = (time?: string): string => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hh = parts[0]?.padStart(2, '0') || '00';
  const mm = parts[1]?.padStart(2, '0') || '00';
  return `${hh}:${mm}`;
};

export const calculateDuration = (departure: string, arrival: string): string => {
  const [depH, depM] = departure.split(':').map(Number);
  const [arrH, arrM] = arrival.split(':').map(Number);
  const totalMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes > 0 ? minutes.toString().padStart(2, '0') : '00'}`;
};
