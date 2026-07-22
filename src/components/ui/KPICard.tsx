import React from 'react';

const KPICard: React.FC<{ title: string; value: React.ReactNode; note?: string }> = ({ title, value, note }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">{title}</div>
        {note && <div className="text-xs text-green-500">{note}</div>}
      </div>
      <div className="mt-4 text-2xl font-extrabold text-gray-900">{value}</div>
    </div>
  );
};

export default KPICard;
