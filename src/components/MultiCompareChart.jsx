import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6', 
  '#1abc9c', '#e67e22', '#34495e', '#ff7f50', '#ff6b81'
];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const MultiCompareChart = ({ data }) => {
  if (!data || !data.chart_data || data.chart_data.length === 0) return null;

  // Sort final values for the leaderboard
  const sortedTickers = [...data.tickers].sort((a, b) => data.final_values[b] - data.final_values[a]);

  return (
    <div style={{ marginTop: '24px' }}>
      <div className="glass-card" style={{ height: '550px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>$100,000 Initial Investment Growth</h3>
        <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '24px' }}>
          This chart visualizes exactly how much a hypothetical $100,000 investment would be worth today based on the selected historical lookback period.
        </p>
        
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={data.chart_data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="date" stroke="#a0a0ab" minTickGap={30} />
            <YAxis 
              stroke="#a0a0ab" 
              tickFormatter={(value) => `$${(value / 1000).toFixed(2)}k`} 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141418', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value, name) => [formatCurrency(value), name]}
            />
            <Legend />
            {data.tickers.map((ticker, index) => (
              <Line 
                key={ticker}
                type="monotone" 
                dataKey={ticker} 
                stroke={COLORS[index % COLORS.length]} 
                strokeWidth={2} 
                dot={false} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '16px' }}>Final Value Leaderboard</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {sortedTickers.map((ticker, index) => {
            const finalVal = data.final_values[ticker];
            const isProfit = finalVal >= 100000;
            const percentage = ((finalVal - 100000) / 100000) * 100;
            
            return (
              <div key={ticker} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${COLORS[index % COLORS.length]}` }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{ticker}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 600, color: isProfit ? 'var(--success)' : 'var(--error)' }}>
                  {formatCurrency(finalVal)}
                </div>
                <div className="subtitle" style={{ fontSize: '0.9rem' }}>
                  {isProfit ? '+' : ''}{percentage.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MultiCompareChart;
