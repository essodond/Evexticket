import React from 'react';
// ADMIN CHARTS
// Composant réutilisable qui affiche des graphiques (Révenus, Croissance, Répartition)
// à partir des données passées en props. Utilise recharts.
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Company as TCompany, Trip as TTrip } from '../types';

type Company = TCompany;
type Trip = TTrip;

interface AdminChartsProps {
  className?: string;
  stats?: {
    total_bookings?: number;
    bookings_this_week?: number;
    bookings_this_month?: number;
    total_revenue?: number;
    revenue_this_week?: number;
    revenue_this_month?: number;
    active_trips?: number;
    active_companies?: number;
    total_users?: number;
    monthly_bookings?: Array<{ month: string; total_bookings: number }>;
    monthly_revenue?: Array<{ month: string; total_revenue: number }>;
    booking_status_counts?: {
      confirmed: number;
      pending: number;
      cancelled: number;
    };
    top_companies?: Array<{ company_name: string; trips: number; revenue: number }>;
  } | null;
  companies?: Company[];
  trips?: Trip[];
}

const AdminCharts: React.FC<AdminChartsProps> = ({ className = '', stats = null, companies = [], trips = [] }) => {
  const formatCurrency = (value: number) => `${(value / 1000000).toFixed(1)}M FCFA`;
  const formatNumber = (value: number) => value.toLocaleString('fr-FR');

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const revenueData = stats?.monthly_revenue?.map(item => ({
    month: item.month,
    revenue: item.total_revenue,
    bookings: stats?.monthly_bookings?.find(b => b.month === item.month)?.total_bookings ?? 0,
  })) ?? months.slice(0, 6).map(month => ({ month, revenue: 0, bookings: 0 }));

  const bookingStatusData = stats?.booking_status_counts
    ? [
        { name: 'Confirmés', value: stats.booking_status_counts.confirmed, color: '#10B981' },
        { name: 'En attente', value: stats.booking_status_counts.pending, color: '#F59E0B' },
        { name: 'Annulés', value: stats.booking_status_counts.cancelled, color: '#EF4444' },
      ]
    : [
        { name: 'Confirmés', value: 0, color: '#10B981' },
        { name: 'En attente', value: 0, color: '#F59E0B' },
        { name: 'Annulés', value: 0, color: '#EF4444' },
      ];

  const companyStats = stats?.top_companies?.map((entry, idx) => ({
    name: entry.company_name,
    trips: entry.trips,
    revenue: entry.revenue,
    color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][idx % 6],
  })) ?? (companies.length
    ? companies.slice(0, 6).map((c, idx) => ({
        name: c.name,
        trips: trips.filter(t => String((t as any).companyId ?? (t as any).company) === String(c.id)).length,
        revenue: 0,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][idx % 6],
      }))
    : [{ name: 'Aucune', trips: 0, revenue: 0, color: '#3B82F6' }]);

  const usersGrowthData = months.map((month, idx) => ({
    month,
    newUsers: Math.round(((stats?.total_users ?? 0) / 12) * (0.8 + idx / 24)),
    totalUsers: Math.round(((stats?.total_users ?? 0) / 12) * (idx + 1)),
  }));

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Évolution des revenus */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des revenus</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : formatNumber(value),
                  name === 'revenue' ? 'Revenus' : 'Réservations'
                ]}
                labelFormatter={(label) => `Mois: ${label}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Revenus"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Croissance des utilisateurs */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Croissance des utilisateurs</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usersGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatNumber(value),
                  name === 'newUsers' ? 'Nouveaux utilisateurs' : 'Total utilisateurs'
                ]}
                labelFormatter={(label) => `Mois: ${label}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="Nouveaux utilisateurs"
              />
              <Line
                type="monotone"
                dataKey="totalUsers"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Total utilisateurs"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance des compagnies */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance des compagnies</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyStats} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  width={120}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenus']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {companyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Statut des réservations */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut des réservations</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Pourcentage']}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-sm text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Réservations par mois */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Réservations par mois</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value), 'Réservations']}
                labelFormatter={(label) => `Mois: ${label}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="bookings" 
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
                name="Réservations"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminCharts;
