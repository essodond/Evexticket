import React from 'react';
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

interface AdminChartsProps {
  className?: string;
}

const AdminCharts: React.FC<AdminChartsProps> = ({ className = '' }) => {
  // Données simulées pour les graphiques
  const revenueData = [
    { month: 'Jan', revenue: 1200000, bookings: 245 },
    { month: 'Fév', revenue: 1350000, bookings: 267 },
    { month: 'Mar', revenue: 1420000, bookings: 289 },
    { month: 'Avr', revenue: 1580000, bookings: 312 },
    { month: 'Mai', revenue: 1650000, bookings: 298 },
    { month: 'Juin', revenue: 1720000, bookings: 325 },
    { month: 'Juil', revenue: 1890000, bookings: 356 },
    { month: 'Août', revenue: 1950000, bookings: 378 },
    { month: 'Sep', revenue: 1820000, bookings: 342 },
    { month: 'Oct', revenue: 1980000, bookings: 389 },
    { month: 'Nov', revenue: 2100000, bookings: 412 },
    { month: 'Déc', revenue: 2250000, bookings: 445 }
  ];

  const userGrowthData = [
    { month: 'Jan', newUsers: 45, totalUsers: 1200 },
    { month: 'Fév', newUsers: 52, totalUsers: 1252 },
    { month: 'Mar', newUsers: 48, totalUsers: 1300 },
    { month: 'Avr', newUsers: 61, totalUsers: 1361 },
    { month: 'Mai', newUsers: 55, totalUsers: 1416 },
    { month: 'Juin', newUsers: 67, totalUsers: 1483 },
    { month: 'Juil', newUsers: 72, totalUsers: 1555 },
    { month: 'Août', newUsers: 68, totalUsers: 1623 },
    { month: 'Sep', newUsers: 59, totalUsers: 1682 },
    { month: 'Oct', newUsers: 74, totalUsers: 1756 },
    { month: 'Nov', newUsers: 78, totalUsers: 1834 },
    { month: 'Déc', newUsers: 85, totalUsers: 1919 }
  ];

  const companyStats = [
    { name: 'TogoBus Express', trips: 45, revenue: 820000, color: '#3B82F6' },
    { name: 'Lomé Transport', trips: 32, revenue: 654000, color: '#10B981' },
    { name: 'Kara Lines', trips: 28, revenue: 487000, color: '#F59E0B' },
    { name: 'Togo Trans', trips: 24, revenue: 423000, color: '#EF4444' },
    { name: 'Autres', trips: 18, revenue: 312000, color: '#8B5CF6' }
  ];

  const bookingStatusData = [
    { name: 'Confirmés', value: 78, color: '#10B981' },
    { name: 'En attente', value: 15, color: '#F59E0B' },
    { name: 'Annulés', value: 7, color: '#EF4444' }
  ];

  const formatCurrency = (value: number) => {
    return `${(value / 1000000).toFixed(1)}M FCFA`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

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
            <LineChart data={userGrowthData}>
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
