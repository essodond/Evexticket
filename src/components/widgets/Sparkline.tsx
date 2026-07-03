import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data = [], color = '#2563EB' }) => {
  const d = data.map((v, i) => ({ x: i, y: v }));
  return (
    <div className="w-full h-8">
      <ResponsiveContainer>
        <LineChart data={d}>
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
