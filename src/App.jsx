import React, { useState, useEffect } from 'react';
import PairCard from './components/PairCard';
import ChartCard from './components/ChartCard';
import MultiCompareChart from './components/MultiCompareChart';
import { Search, LayoutDashboard, Save, Trash2, LineChart as LineChartIcon, Smartphone } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [alerting, setAlerting] = useState({});
  const [passcode, setPasscode] = useState(localStorage.getItem('app_passcode') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('app_passcode'));

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-passcode': passcode
  });

  const handleAuthError = () => {
    localStorage.removeItem('app_passcode');
    setIsAuthenticated(false);
    setPasscode('');
    alert('Session expired or Invalid Passcode. Please login again.');
  };

  // Research State
  const [rTickerA, setRTickerA] = useState('');
  const [rTickerB, setRTickerB] = useState('');
  const [rName, setRName] = useState('');
  const [rWindow, setRWindow] = useState(60);
  const [rLookback, setRLookback] = useState('1y');
  const [rData, setRData] = useState(null);
  const [rLoading, setRLoading] = useState(false);

  // Multi-Compare State
  const [mcTickers, setMcTickers] = useState(localStorage.getItem('mcTickers') || '');
  const [mcLookback, setMcLookback] = useState(localStorage.getItem('mcLookback') || '1y');
  const [mcData, setMcData] = useState(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcPresets, setMcPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mcPresets')) || []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('mcPresets', JSON.stringify(mcPresets));
  }, [mcPresets]);

  useEffect(() => {
    localStorage.setItem('mcTickers', mcTickers);
  }, [mcTickers]);

  useEffect(() => {
    localStorage.setItem('mcLookback', mcLookback);
  }, [mcLookback]);

  useEffect(() => {
    if (activeTab === 'dashboard') fetchScan();
  }, [activeTab]);

  const fetchScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/scan', { headers: getHeaders() });
      if (response.status === 401) return handleAuthError();
      if (!response.ok) throw new Error(`API returned status ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError("Failed to fetch data. Is the backend deployed and API key set?");
    }
    setLoading(false);
  };

  const runResearch = async (e) => {
    e.preventDefault();
    if (!rTickerA || !rTickerB) return;
    setRLoading(true);
    setRData(null);
    try {
      const response = await fetch(`/api/research?ticker_a=${rTickerA}&ticker_b=${rTickerB}&window=${rWindow}&lookback=${rLookback}`, { headers: getHeaders() });
      if (response.status === 401) return handleAuthError();
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Research failed');
      }
      const result = await response.json();
      // Ensure the name is passed back into the UI state if available
      result.name = rName || `${rTickerA} / ${rTickerB}`;
      setRData(result);
    } catch (err) {
      alert(err.message);
    }
    setRLoading(false);
  };

  const savePair = async () => {
    if (!rData) return;
    try {
      const response = await fetch('/api/pairs', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ticker_a: rData.ticker_a,
          ticker_b: rData.ticker_b,
          name: rName || `${rData.ticker_a} / ${rData.ticker_b}`,
          window: rData.window
        })
      });
      if (response.status === 401) return handleAuthError();
      if (response.ok) {
        alert('Pair saved to database! It will now be tracked in the Telegram cron scans.');
        setActiveTab('dashboard');
      } else {
        const errData = await response.json();
        alert(`Failed to save pair: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const deletePair = async (pairId) => {
    if (!window.confirm("Delete this pair from tracked database?")) return;
    try {
      const response = await fetch(`/api/pairs/${pairId}`, { method: 'DELETE', headers: getHeaders() });
      if (response.status === 401) return handleAuthError();
      fetchScan();
    } catch (err) {
      alert('Failed to delete pair');
    }
  };

  const sendInstantAlert = async (pairId) => {
    setAlerting(prev => ({ ...prev, [pairId]: true }));
    try {
      const response = await fetch(`/api/scan/${pairId}`, { method: 'POST', headers: getHeaders() });
      if (response.status === 401) return handleAuthError();
      if (!response.ok) throw new Error('Failed to send alert');
      alert('Alert sent to your Telegram! 📱');
    } catch (err) {
      alert('Failed to send instant alert. Ensure backend is deployed.');
    }
    setAlerting(prev => ({ ...prev, [pairId]: false }));
  };

  const runMultiCompareWithArgs = async (tickers, lookback) => {
    setMcTickers(tickers);
    setMcLookback(lookback);
    if (!tickers) return;
    setMcLoading(true);
    setMcData(null);
    try {
      const response = await fetch(`/api/multi-compare?tickers=${tickers}&lookback=${lookback}`, { headers: getHeaders() });
      if (response.status === 401) return handleAuthError();
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Multi-compare failed');
      }
      const result = await response.json();
      setMcData(result);
    } catch (err) {
      alert(err.message);
    }
    setMcLoading(false);
  };

  const runMultiCompare = async (e) => {
    e.preventDefault();
    runMultiCompareWithArgs(mcTickers, mcLookback);
  };

  const handleSavePreset = () => {
    if (!mcTickers) return;
    const name = prompt("Enter a name for this preset (e.g. Tech Giants):", mcTickers);
    if (!name) return;
    setMcPresets([...mcPresets, { name, tickers: mcTickers, lookback: mcLookback }]);
  };

  const handleDeletePreset = (index) => {
    setMcPresets(mcPresets.filter((_, i) => i !== index));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('app_passcode', passcode);
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px 20px' }}>
          <h2>Security Lock</h2>
          <p className="subtitle" style={{ marginBottom: '24px' }}>Enter your master passcode to access the trading engine.</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="password" 
              value={passcode} 
              onChange={e => setPasscode(e.target.value)} 
              placeholder="Enter Passcode" 
              className="input-field"
              required 
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Unlock Engine</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <div>
          <h1>Super Trading App</h1>
          <p className="subtitle">Statistical Arbitrage & Cointegration Engine</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn" 
            style={{ background: activeTab === 'dashboard' ? 'var(--accent)' : 'var(--bg-card)' }}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Dashboard
          </button>
          <button 
            className="btn" 
            style={{ background: activeTab === 'research' ? 'var(--accent)' : 'var(--bg-card)' }}
            onClick={() => setActiveTab('research')}
          >
            <Search size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Research Pairs
          </button>
          <button 
            className="btn" 
            style={{ background: activeTab === 'multicompare' ? 'var(--accent)' : 'var(--bg-card)' }}
            onClick={() => setActiveTab('multicompare')}
          >
            <LineChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> Multi-Compare
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Tracked Pairs</h2>
              <button className="btn" onClick={fetchScan} disabled={loading}>
                {loading ? 'Scanning Markets...' : 'Refresh Scan'}
              </button>
            </div>
            
            {error && (
              <div className="glass-card" style={{ borderLeft: '4px solid var(--error)', marginBottom: '24px' }}>
                <h3 className="text-error">Connection Error</h3>
                <p>{error}</p>
              </div>
            )}

            {!data && loading && (
              <div style={{ textAlign: 'center', padding: '40px' }} className="subtitle">
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                Fetching daily market data and running statistical models...
              </div>
            )}

            {data && data.status === "success" && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {(!data.data || data.data.length === 0) && (
                  <div className="glass-card subtitle" style={{ textAlign: 'center' }}>No pairs tracked yet. Go to Research to add some!</div>
                )}
                {data.data && data.data.map((pair, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <PairCard pair={pair} />
                    {!pair.error && (
                      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => sendInstantAlert(pair.pair_id)}
                          style={{ background: 'transparent', border: 'none', color: alerting[pair.pair_id] ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}
                          title="Send instant alert to phone"
                          disabled={alerting[pair.pair_id]}
                        >
                          <Smartphone size={18} />
                        </button>
                        <button 
                          onClick={() => deletePair(pair.pair_id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          title="Remove pair from tracking"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'research' && (
          <div className="fade-in">
            <h2>Research Hub</h2>
            <p className="subtitle" style={{ marginBottom: '24px' }}>Test new pairs across global exchanges. If they pass the math, save them to your automated bot.</p>
            
            <form onSubmit={runResearch} className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Ticker A</label>
                <input required value={rTickerA} onChange={e => setRTickerA(e.target.value.toUpperCase())} placeholder="e.g. AAPL" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Ticker B</label>
                <input required value={rTickerB} onChange={e => setRTickerB(e.target.value.toUpperCase())} placeholder="e.g. MSFT" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Pair Name (Optional)</label>
                <input value={rName} onChange={e => setRName(e.target.value)} placeholder="Big Tech" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Rolling Window</label>
                <select value={rWindow} onChange={e => setRWindow(Number(e.target.value))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }}>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={120}>120 Days</option>
                  <option value={252}>1 Year (252 Days)</option>
                  <option value={504}>2 Years (504 Days)</option>
                  <option value={756}>3 Years (756 Days)</option>
                  <option value={1260}>5 Years (1260 Days)</option>
                </select>
              </div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Chart Lookback</label>
                <select value={rLookback} onChange={e => setRLookback(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }}>
                  <option value="1y">1 Year</option>
                  <option value="2y">2 Years</option>
                  <option value="3y">3 Years</option>
                  <option value="5y">5 Years</option>
                </select>
              </div>
              <button type="submit" className="btn" disabled={rLoading}>
                {rLoading ? 'Crunching...' : 'Analyze'}
              </button>
            </form>

            {rLoading && (
              <div style={{ textAlign: 'center', padding: '40px' }} className="subtitle">
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚙️</div>
                Fetching 250 days of data and running Cointegration math...
              </div>
            )}

            {rData && !rLoading && (
              <div style={{ marginTop: '32px' }}>
                <PairCard pair={rData} />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button className="btn" style={{ background: 'var(--success)' }} onClick={savePair}>
                    <Save size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }}/> 
                    Save to Tracked Pairs
                  </button>
                </div>

                <ChartCard data={rData.chart_data} tickerA={rData.ticker_a} tickerB={rData.ticker_b} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'multicompare' && (
          <div className="fade-in">
            <h2>Equity Curve Analyzer</h2>
            <p className="subtitle" style={{ marginBottom: '24px' }}>Compare the compounding natural log returns of up to 10 stocks simultaneously.</p>
            
            <form onSubmit={runMultiCompare} className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Tickers (Comma Separated)</label>
                <input required value={mcTickers} onChange={e => setMcTickers(e.target.value.toUpperCase())} placeholder="e.g. AAPL, MSFT, GOOG, NVDA, TSLA" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div>
                <label className="subtitle" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Chart Lookback</label>
                <select value={mcLookback} onChange={e => setMcLookback(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white', minWidth: '150px' }}>
                  <option value="1y">1 Year</option>
                  <option value="2y">2 Years</option>
                  <option value="3y">3 Years</option>
                  <option value="5y">5 Years</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn" disabled={mcLoading}>
                  {mcLoading ? 'Crunching...' : 'Compare Equities'}
                </button>
                <button type="button" className="btn" onClick={handleSavePreset} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '10px' }} title="Save Preset">
                  <Save size={18} />
                </button>
              </div>
            </form>

            {mcPresets.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 className="subtitle" style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Saved Presets</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {mcPresets.map((preset, index) => (
                    <div 
                      key={index} 
                      className="glass-card" 
                      style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }} 
                      onClick={() => runMultiCompareWithArgs(preset.tickers, preset.lookback)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{preset.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--subtitle)' }}>{preset.lookback.toUpperCase()} • {preset.tickers}</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(index); }} 
                        style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px', fontSize: '1.2rem', marginLeft: 'auto' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mcLoading && (
              <div style={{ textAlign: 'center', padding: '40px' }} className="subtitle">
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚙️</div>
                Fetching historical data and calculating log returns...
              </div>
            )}

            {mcData && !mcLoading && (
              <MultiCompareChart data={mcData} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
