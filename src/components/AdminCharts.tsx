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

interface Company {
  id: string;
  name: string;
}

interface Trip {
  id: string;
  companyId: string;
}

interface AdminChartsProps {
  className?: string;
  stats?: {
    totalUsers: number;
    totalCompanies: number;
    totalTrips: number;
    totalBookings: number;
    totalRevenue: number;
    monthlyGrowth: number;
  } | null;
  companies?: Company[];
  trips?: Trip[];
}

const AdminCharts: React.FC<AdminChartsProps> = ({ className = '', stats = null, companies = [], trips = [] }) => {
  // Générer des séries de données à partir des statistiques réelles (fallback aux valeurs simulées)
  const defaultRevenue = stats?.totalRevenue ?? 2250000;
  const defaultTotalUsers = stats?.totalUsers ?? 1919;
  const defaultTotalTrips = stats?.totalTrips ?? 356;

  // Répartir le revenu sur 12 mois de façon simple
  const baseMonthly = Math.round(defaultRevenue / 12);
  const revenueData = Array.from({ length: 12 }).map((_, i) => ({
    month: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][i],
    revenue: Math.round(baseMonthly * (1 + ((i / 11) * (stats?.monthlyGrowth ? stats.monthlyGrowth / 100 : 0.15)))),
    bookings: Math.max(0, Math.round((stats?.totalBookings ?? 445) / 12))
  }));

  // Générer une courbe de croissance utilisateurs simple
  const totalUsers = defaultTotalUsers;
  const monthlyIncrease = stats?.monthlyGrowth ? Math.max(1, Math.round((stats.monthlyGrowth / 100) * totalUsers / 12)) : 50;
  let cumulative = Math.max(0, totalUsers - monthlyIncrease * 11);
  const userGrowthData = Array.from({ length: 12 }).map((_, i) => {
    const newUsers = monthlyIncrease + Math.round((i / 11) * monthlyIncrease);
    cumulative += newUsers;
    return { month: ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][i], newUsers, totalUsers: Math.max(cumulative, newUsers) };
  });

  // Composer les stats par compagnie en utilisant les trajets existants
  const tripCountsByCompany: Record<string, number> = {};
  trips.forEach(t => { tripCountsByCompany[t.companyId] = (tripCountsByCompany[t.companyId] || 0) + 1; });
  const totalTripsCount = Object.values(tripCountsByCompany).reduce((s, v) => s + v, 0) || defaultTotalTrips;

  const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  const companyStats = (companies.length ? companies : [{ id: '0', name: 'Aucune' }]).map((c, idx) => {
    const tripsFor = tripCountsByCompany[c.id] || 0;
    const revenue = Math.round(defaultRevenue * (tripsFor / Math.max(1, totalTripsCount)));
    return { name: c.name, trips: tripsFor, revenue, color: palette[idx % palette.length] };
  }).slice(0, 6);

  // Statut des réservations: pas de liste complète ici, on utilise une estimation basée sur totals
  const confirmed = Math.round((stats?.totalBookings ?? 445) * 0.75);
  const pending = Math.round((stats?.totalBookings ?? 445) * 0.18);
  const cancelled = Math.max(0, (stats?.totalBookings ?? 445) - confirmed - pending);
  const bookingStatusData = [
    { name: 'Confirmés', value: confirmed, color: '#10B981' },
    { name: 'En attente', value: pending, color: '#F59E0B' },
    { name: 'Annulés', value: cancelled, color: '#EF4444' }
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
