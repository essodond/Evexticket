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

interface CompanyChartsProps {
  className?: string;
}

const CompanyCharts: React.FC<CompanyChartsProps> = ({ className = '' }) => {
  // Données simulées pour les graphiques de la compagnie
  const bookingTrendData = [
    { month: 'Jan', bookings: 45, revenue: 225000 },
    { month: 'Fév', bookings: 52, revenue: 260000 },
    { month: 'Mar', bookings: 48, revenue: 240000 },
    { month: 'Avr', bookings: 61, revenue: 305000 },
    { month: 'Mai', bookings: 55, revenue: 275000 },
    { month: 'Juin', bookings: 67, revenue: 335000 },
    { month: 'Juil', bookings: 72, revenue: 360000 },
    { month: 'Août', bookings: 68, revenue: 340000 },
    { month: 'Sep', bookings: 59, revenue: 295000 },
    { month: 'Oct', bookings: 74, revenue: 370000 },
    { month: 'Nov', bookings: 78, revenue: 390000 },
    { month: 'Déc', bookings: 85, revenue: 425000 }
  ];

  const routePerformanceData = [
    { route: 'Lomé → Kara', bookings: 156, revenue: 780000, occupancy: 78 },
    { route: 'Kara → Lomé', bookings: 142, revenue: 710000, occupancy: 71 },
    { route: 'Lomé → Kpalimé', bookings: 98, revenue: 294000, occupancy: 82 },
    { route: 'Kpalimé → Lomé', bookings: 89, revenue: 267000, occupancy: 74 },
    { route: 'Lomé → Sokodé', bookings: 67, revenue: 335000, occupancy: 67 },
    { route: 'Sokodé → Lomé', bookings: 61, revenue: 305000, occupancy: 61 }
  ];

  const bookingStatusData = [
    { name: 'Confirmés', value: 82, color: '#10B981' },
    { name: 'En attente', value: 12, color: '#F59E0B' },
    { name: 'Annulés', value: 6, color: '#EF4444' }
  ];

  const busTypeData = [
    { name: 'Premium', bookings: 45, revenue: 450000, color: '#3B82F6' },
    { name: 'Standard', bookings: 38, revenue: 228000, color: '#10B981' },
    { name: 'VIP', bookings: 12, revenue: 180000, color: '#F59E0B' },
    { name: 'Luxury', bookings: 8, revenue: 160000, color: '#8B5CF6' }
  ];

  const weeklyBookings = [
    { day: 'Lun', bookings: 12, revenue: 60000 },
    { day: 'Mar', bookings: 15, revenue: 75000 },
    { day: 'Mer', bookings: 18, revenue: 90000 },
    { day: 'Jeu', bookings: 22, revenue: 110000 },
    { day: 'Ven', bookings: 28, revenue: 140000 },
    { day: 'Sam', bookings: 25, revenue: 125000 },
    { day: 'Dim', bookings: 20, revenue: 100000 }
  ];

  const formatCurrency = (value: number) => {
    return `${(value / 1000).toFixed(0)}K FCFA`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Évolution des réservations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des réservations</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bookingTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                yAxisId="left"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatNumber}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'bookings' ? formatNumber(value) : formatCurrency(value),
                  name === 'bookings' ? 'Réservations' : 'Revenus'
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
                yAxisId="left"
                type="monotone"
                dataKey="bookings"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Réservations"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Revenus"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance des trajets */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance des trajets</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routePerformanceData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatNumber}
              />
              <YAxis 
                type="category"
                dataKey="route"
                stroke="#6b7280"
                fontSize={12}
                width={140}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'bookings' ? formatNumber(value) : 
                  name === 'revenue' ? formatCurrency(value) : 
                  formatPercentage(value),
                  name === 'bookings' ? 'Réservations' : 
                  name === 'revenue' ? 'Revenus' : 'Taux d\'occupation'
                ]}
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
                fill="#3B82F6"
                radius={[0, 4, 4, 0]}
                name="Réservations"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

        {/* Performance par type de bus */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance par type de bus</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
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
                    name === 'bookings' ? 'Réservations' : 'Revenus'
                  ]}
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
                  radius={[4, 4, 0, 0]}
                  name="Réservations"
                >
                  {busTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Réservations par jour de la semaine */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Réservations par jour de la semaine</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
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
                  name === 'bookings' ? formatNumber(value) : formatCurrency(value),
                  name === 'bookings' ? 'Réservations' : 'Revenus'
                ]}
                labelFormatter={(label) => `Jour: ${label}`}
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
                dataKey="bookings"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                name="Réservations"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#F59E0B"
                strokeWidth={3}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                name="Revenus"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taux d'occupation des trajets */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Taux d'occupation des trajets</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="route" 
                stroke="#6b7280"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={formatPercentage}
              />
              <Tooltip 
                formatter={(value: number) => [formatPercentage(value), 'Taux d\'occupation']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="occupancy" 
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                name="Taux d'occupation (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CompanyCharts;
