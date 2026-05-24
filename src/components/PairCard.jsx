import React from 'react';
import { HelpCircle } from 'lucide-react';

const PairCard = ({ pair }) => {
  if (pair.error) {
    return (
      <div className="glass-card" style={{ borderLeft: '4px solid var(--error)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>{pair.name}</h3>
            <span className="subtitle">{pair.ticker_a} / {pair.ticker_b}</span>
          </div>
          <span className="text-error" style={{ fontWeight: 600 }}>Error: {pair.error}</span>
        </div>
      </div>
    );
  }

  const isZSignal = Math.abs(pair.z_score) >= 2.0;
  const isCointPass = pair.adf_pvalue < 0.05;
  const isCorrPass = pair.correlation >= 0.70;
  
  let verdict = "NO SIGNAL";
  let verdictClass = "text-muted";
  
  if (isZSignal && isCointPass && isCorrPass) {
    verdict = "STRONG SIGNAL";
    verdictClass = "text-success";
  } else if (isZSignal) {
    verdict = "CAUTION SIGNAL";
    verdictClass = "text-warning";
  }

  return (
    <div className="glass-card" style={{ 
      borderLeft: `4px solid ${isZSignal && isCointPass ? 'var(--success)' : (isZSignal ? 'var(--warning)' : 'transparent')}` 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h3>{pair.name}</h3>
          <span className="subtitle">{pair.ticker_a} / {pair.ticker_b} ({pair.window}d window)</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            <span className={pair.z_score > 0 ? 'text-success' : 'text-error'}>
              {pair.z_score > 0 ? '+' : ''}{pair.z_score.toFixed(2)}σ
            </span>
          </div>
          <div className={verdictClass} style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {verdict}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
        <div className="tooltip-container">
          <div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Correlation <HelpCircle size={12} />
            <div className="tooltip">Log-return correlation measures how similarly the two stocks move on a daily basis. <b>Goal: &ge; 70%</b></div>
          </div>
          <div style={{ fontWeight: 600 }} className={isCorrPass ? 'text-success' : 'text-warning'}>
            {(pair.correlation * 100).toFixed(1)}%
          </div>
        </div>
        <div className="tooltip-container">
          <div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Cointegration <HelpCircle size={12} />
            <div className="tooltip">ADF p-value &lt; 0.05 means the spread is mathematically mean-reverting. <b>Goal: Strong</b></div>
          </div>
          <div style={{ fontWeight: 600 }} className={isCointPass ? 'text-success' : (pair.adf_pvalue < 0.10 ? 'text-warning' : 'text-error')}>
            {pair.coint_status}
          </div>
        </div>
        <div className="tooltip-container">
          <div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Hedge Ratio β <HelpCircle size={12} />
            <div className="tooltip">The optimal sizing ratio (calculated via OLS regression) to hedge one stock against the other.</div>
          </div>
          <div style={{ fontWeight: 600 }}>{pair.hedge_ratio.toFixed(3)}</div>
        </div>
        <div className="tooltip-container">
          <div className="subtitle" style={{ fontSize: '0.8rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Spread Diff <HelpCircle size={12} />
            <div className="tooltip">Current divergence from the mean in standard deviations. <b>Goal: &ge; 2.0 SD</b></div>
          </div>
          <div style={{ fontWeight: 600 }}>
            {Math.abs(pair.z_score).toFixed(2)} SD
          </div>
        </div>
      </div>
    </div>
  );
};

export default PairCard;
