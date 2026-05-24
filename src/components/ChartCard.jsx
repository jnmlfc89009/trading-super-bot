import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const ChartCard = ({ data, tickerA, tickerB }) => {
  if (!data || !data.dates) return null;

  // Format data for Recharts
  const chartData = data.dates.map((date, i) => ({
    date,
    zScore: data.z_scores[i],
    [tickerA]: data.norm_a[i],
    [tickerB]: data.norm_b[i],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
      
      {/* Price Growth Chart */}
      <div className="glass-card" style={{ height: '400px' }}>
        <h3 style={{ marginBottom: '16px' }}>Currency-Adjusted Growth (Starting at 100)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="#a0a0ab" minTickGap={30} />
            <YAxis stroke="#a0a0ab" domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value, name) => [value.toFixed(2), name]}
            />
            <Legend />
            <Line type="monotone" dataKey={tickerA} stroke="#2ecc71" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey={tickerB} stroke="#3498db" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Z-Score Chart */}
      <div className="glass-card" style={{ height: '300px' }}>
        <h3 style={{ marginBottom: '16px' }}>Rolling Z-Score Divergence</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="#a0a0ab" minTickGap={30} />
            <YAxis stroke="#a0a0ab" domain={[-4, 4]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              formatter={(value, name) => [value.toFixed(2), name]}
            />
            <ReferenceLine y={2} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={-2} stroke="#10b981" strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Line type="monotone" dataKey="zScore" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Z-Score" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
    </div>
  );
};

export default ChartCard;
