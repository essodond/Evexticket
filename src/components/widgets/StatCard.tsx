import React from 'react';
import Sparkline from './Sparkline';

interface StatCardProps {
  title: string;
  value: string | number;
  percent?: string;
  color?: string;
  icon?: React.ReactNode;
  sparkData?: number[];
}

const StatCard: React.FC<StatCardProps> = ({ title, value, percent, color = '#2563EB', icon, sparkData = [] }) => {
  const hasSpark = Array.isArray(sparkData) && sparkData.length > 1 && new Set(sparkData).size > 1;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div style={{ background: `${color}20`, color: color }} className="p-3 rounded-2xl flex items-center justify-center">
            {icon}
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">{title}</div>
            <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
          </div>
        </div>
        <div className="text-sm text-slate-500 text-right">
          <div className={`text-xs ${percent && percent.startsWith('-') ? 'text-red-600' : 'text-emerald-600'}`}>{percent ?? ''}</div>
        </div>
      </div>
      {hasSpark && (
        <div className="mt-3">
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
