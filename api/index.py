import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from statsmodels.tsa.stattools import adfuller, coint
import yfinance as yf
from dotenv import load_dotenv
from telegram import Bot
import asyncio
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

app = FastAPI(title="Super Trading App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firestore
try:
    firebase_admin.initialize_app(options={'projectId': 'trading-super-bot'})
    db = firestore.client()
except ValueError:
    db = firestore.client()
except Exception as e:
    print(f"Failed to initialize Firebase: {e}")
    db = None

def load_pairs():
    if not db:
        print("Database not connected.")
        return {}
    pairs = {}
    try:
        docs = db.collection('pairs').stream()
        for doc in docs:
            pairs[doc.id] = doc.to_dict()
    except Exception as e:
        print(f"Firestore read error: {e}")
    return pairs

class PairCreate(BaseModel):
    ticker_a: str
    ticker_b: str
    window: int
    name: str

def fetch_yfinance_history(ticker: str, days: int):
    """Fetch historical EOD data from yfinance."""
    end_date = datetime.today()
    start_date = end_date - timedelta(days=days)
    
    try:
        # yfinance can download multiple simultaneously, but for simplicity we do one by one.
        df = yf.download(ticker, start=start_date.strftime('%Y-%m-%d'), end=end_date.strftime('%Y-%m-%d'), progress=False)
        if df.empty:
            print(f"yfinance returned empty dataframe for {ticker}")
            return None
            
        # yf.download sometimes returns MultiIndex columns if multiple tickers.
        # Ensure we just grab the 'Close' column.
        if isinstance(df.columns, pd.MultiIndex):
            close_series = df['Close'][ticker]
        else:
            close_series = df['Close']
            
        close_series.index = pd.to_datetime(close_series.index).tz_localize(None)
        return close_series
    except Exception as e:
        print(f"yfinance API Error for {ticker}: {e}")
        return None

def analyse_pair(ticker_a, ticker_b, window, include_series=False, lookback_days=365):
    """Run the math engine on two tickers."""
    # Fetch enough calendar days to cover the requested lookback PLUS the rolling window buffer
    fetch_days = lookback_days + int(window * 1.5) + 30
    
    close_a = fetch_yfinance_history(ticker_a, fetch_days)
    close_b = fetch_yfinance_history(ticker_b, fetch_days)
    
    if close_a is None or close_b is None:
        return {"error": "Data unavailable"}
        
    prices = pd.concat([close_a, close_b], axis=1, keys=[ticker_a, ticker_b]).dropna()
    if len(prices) < window + 10:
        return {"error": f"Insufficient data (Rows: {len(prices)})"}
        
    # Extract only the most recent 'window' days for the current metrics
    recent_prices = prices.iloc[-window:]
    log_prices_recent = np.log(recent_prices)
    log_returns_recent = log_prices_recent.diff().dropna()
    corr = log_returns_recent[ticker_a].corr(log_returns_recent[ticker_b])
    
    # 2. OLS Hedge Ratio (on recent window)
    log_a_recent = log_prices_recent[ticker_a]
    log_b_recent = log_prices_recent[ticker_b]
    hedge_ratio = np.polyfit(log_b_recent, log_a_recent, 1)[0]
    
    # 3. Cointegration Test (Engle-Granger test via statsmodels coint)
    # This is statistically more rigorous than manual adfuller on residuals
    try:
        coint_t, adf_pvalue, crit_value = coint(log_a_recent, log_b_recent, trend='c', autolag='AIC')
    except Exception:
        adf_pvalue = 1.0
    
    # 4. Rolling Z-Score (For the charts, we still calculate across the entire lookback, 
    # but using a rolling hedge ratio or the full period hedge ratio. For simplicity, 
    # we use the recent hedge ratio to see how the recent relationship looks historically)
    log_prices_full = np.log(prices)
    log_a_full = log_prices_full[ticker_a]
    log_b_full = log_prices_full[ticker_b]
    spread_full = log_a_full - (hedge_ratio * log_b_full)
    
    rolling_mean = spread_full.rolling(window).mean()
    rolling_std = spread_full.rolling(window).std()
    z_series = (spread_full - rolling_mean) / rolling_std
    current_z = z_series.dropna().iloc[-1]
    
    coint_status = "Strong" if adf_pvalue < 0.05 else ("Weak" if adf_pvalue < 0.10 else "Fail")
    
    result = {
        "ticker_a": ticker_a,
        "ticker_b": ticker_b,
        "price_a": float(prices[ticker_a].iloc[-1]),
        "price_b": float(prices[ticker_b].iloc[-1]),
        "z_score": float(current_z),
        "correlation": float(corr),
        "hedge_ratio": float(hedge_ratio),
        "adf_pvalue": float(adf_pvalue),
        "coint_status": coint_status,
        "window": window
    }

    if include_series:
        # Prepare arrays for charts
        z_series_clean = z_series.dropna()
        
        # Trim the chart data exactly to the requested lookback period (removing the calculation buffer)
        start_date_chart = pd.Timestamp.today().tz_localize(None) - pd.Timedelta(days=lookback_days)
        z_series_clean = z_series_clean[z_series_clean.index >= start_date_chart]
        
        dates = z_series_clean.index.strftime('%Y-%m-%d').tolist()
        
        # Normalized prices for growth chart (start at 100)
        norm_a = (prices[ticker_a].loc[z_series_clean.index] / prices[ticker_a].loc[z_series_clean.index[0]]) * 100
        norm_b = (prices[ticker_b].loc[z_series_clean.index] / prices[ticker_b].loc[z_series_clean.index[0]]) * 100

        result["chart_data"] = {
            "dates": dates,
            "z_scores": z_series_clean.tolist(),
            "norm_a": norm_a.tolist(),
            "norm_b": norm_b.tolist()
        }

    return result

def build_daily_report(stats_list):
    actionable = []
    monitoring = []
    failed = []
    
    for stats in stats_list:
        if "error" in stats:
            failed.append(f"• {stats['name']} (Data Error)")
            continue
            
        z = stats["z_score"]
        coint_pass = stats["adf_pvalue"] < 0.10
        corr_pass = stats["correlation"] >= 0.70
        
        pair_str = f"{stats['ticker_a']}/{stats['ticker_b']}"
        
        if coint_pass and corr_pass:
            if abs(z) >= 2.0:
                direction = f"SELL {stats['ticker_a']}, BUY {stats['ticker_b']}" if z > 0 else f"BUY {stats['ticker_a']}, SELL {stats['ticker_b']}"
                actionable.append(f"• *{pair_str}*: Z={z:+.2f} | p={stats['adf_pvalue']:.2f} | {direction}")
            else:
                monitoring.append(f"• {pair_str}: Z={z:+.2f} | p={stats['adf_pvalue']:.2f}")
        else:
            failed.append(f"• {pair_str} (p={stats['adf_pvalue']:.2f}, corr={stats['correlation']:.2f})")
            
    # Build Message
    msg = "📅 *Daily Stat Arb Briefing*\n\n"
    
    if actionable:
        msg += "🚨 *ACTIONABLE SIGNALS*\n" + "\n".join(actionable) + "\n\n"
    else:
        msg += "🚨 *ACTIONABLE SIGNALS*\n• None today.\n\n"
        
    if monitoring:
        msg += "👀 *MONITORING (Z < 2.0)*\n" + "\n".join(monitoring) + "\n\n"
        
    if failed:
        msg += "❌ *FAILED COINTEGRATION / CORR*\n" + "\n".join(failed) + "\n\n"
        
    msg += "📱 [Open Super App Dashboard](https://trading-super-bot.vercel.app/)"
    return msg

def build_instant_alert_message(stats):
    if "error" in stats:
        return f"⚠️ *Error fetching data for {stats.get('name', 'Pair')}*: {stats['error']}"
        
    z = stats["z_score"]
    coint_pass = stats["adf_pvalue"] < 0.10
    corr_pass = stats["correlation"] >= 0.70
    
    strength = "🚨 EXTREME" if abs(z) > 3.0 else ("🔥 STRONG" if abs(z) > 2.0 else "👀 MONITORING")
    if z > 0:
        direction = f"SELL {stats['ticker_a']}, BUY {stats['ticker_b']}"
    else:
        direction = f"BUY {stats['ticker_a']}, SELL {stats['ticker_b']}"
        
    coint_status = "✅ PASS" if coint_pass else "❌ FAIL"
    corr_status = "✅ PASS" if corr_pass else "❌ FAIL"

    return f"""
🔔 *ON-DEMAND SCAN: {stats['name']}*

📊 *Signal Metrics*
  • Z-Score:       `{z:+.2f} σ`  {strength}
  • Correlation:   `{stats['correlation']:.2f}`  {corr_status}
  • Hedge Ratio β: `{stats['hedge_ratio']:.3f}`
  • Action:        *{direction}*

🧪 *Cointegration (Engle-Granger)*
  • p-value: `{stats['adf_pvalue']:.4f}`  {coint_status}
  
📱 [Open Super App Dashboard](https://trading-super-bot.vercel.app/)
"""

async def send_telegram_alert(message: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("Telegram credentials not configured. Skipping alert.")
        return
    bot = Bot(token=TELEGRAM_TOKEN)
    await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message, parse_mode='Markdown', disable_web_page_preview=True)

@app.get("/api/pairs")
def get_pairs():
    return load_pairs()

@app.post("/api/pairs")
def add_pair(pair: PairCreate):
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    pair_id = f"{pair.ticker_a.lower()}_{pair.ticker_b.lower()}"
    data = {
        "ticker_a": pair.ticker_a.upper(),
        "ticker_b": pair.ticker_b.upper(),
        "name": pair.name,
        "window": pair.window
    }
    try:
        db.collection('pairs').document(pair_id).set(data)
        return {"status": "success", "message": f"Added {pair.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/pairs/{pair_id}")
def delete_pair(pair_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        db.collection('pairs').document(pair_id).delete()
        return {"status": "success", "message": "Deleted pair"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/research")
def research_pair(ticker_a: str, ticker_b: str, window: int = 60, lookback: str = "1y"):
    lookback_map = {"1y": 365, "2y": 730, "3y": 1095, "5y": 1825}
    days = lookback_map.get(lookback, 365)
    
    stats = analyse_pair(ticker_a.upper(), ticker_b.upper(), window, include_series=True, lookback_days=days)
    if "error" in stats:
        raise HTTPException(status_code=400, detail=stats["error"])
    return stats

@app.get("/api/multi-compare")
def multi_compare(tickers: str, lookback: str = "1y"):
    lookback_map = {"1y": 365, "2y": 730, "3y": 1095, "5y": 1825}
    days = lookback_map.get(lookback, 365)
    
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No valid tickers provided")
    if len(ticker_list) > 10:
        raise HTTPException(status_code=400, detail="Maximum of 10 tickers allowed")
        
    series_dict = {}
    for ticker in ticker_list:
        data = fetch_yfinance_history(ticker, days)
        if data is not None:
            series_dict[ticker] = data
            
    if not series_dict:
        raise HTTPException(status_code=400, detail="Could not fetch data for any provided tickers")
        
    df = pd.DataFrame(series_dict).dropna()
    if df.empty:
        raise HTTPException(status_code=400, detail="No overlapping data found for the provided tickers")
        
    # Calculate $100k investment growth
    # Equity = $100,000 * (P_t / P_0)
    start_prices = df.iloc[0]
    equity_curves = (df / start_prices) * 100000
    
    dates = equity_curves.index.strftime('%Y-%m-%d').tolist()
    
    chart_data = []
    final_values = {}
    for i, date in enumerate(dates):
        row = {"date": date}
        for ticker in df.columns:
            val = float(equity_curves[ticker].iloc[i])
            row[ticker] = val
            if i == len(dates) - 1:
                final_values[ticker] = val
        chart_data.append(row)
        
    return {
        "status": "success",
        "tickers": list(df.columns),
        "chart_data": chart_data,
        "final_values": final_values
    }

@app.get("/api/scan")
async def run_scan():
    results = []
    pairs = load_pairs()
    
    if not pairs:
        await send_telegram_alert("⚠️ No pairs in database. Add pairs via the Dashboard.")
        return {"status": "success", "message": "No pairs to scan.", "data": []}
        
    for pair_id, details in pairs.items():
        stats = analyse_pair(details['ticker_a'], details['ticker_b'], details['window'], include_series=False)
        stats["name"] = details["name"]
        stats["pair_id"] = pair_id
        results.append(stats)
        
    # Build and send the daily report
    report_msg = build_daily_report(results)
    await send_telegram_alert(report_msg)
            
    return {"status": "success", "message": "Daily report sent.", "data": results}

@app.post("/api/scan/{pair_id}")
async def run_instant_scan(pair_id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    doc_ref = db.collection('pairs').document(pair_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Pair not found")
        
    details = doc.to_dict()
    stats = analyse_pair(details['ticker_a'], details['ticker_b'], details['window'], include_series=False)
    stats["name"] = details["name"]
    stats["pair_id"] = pair_id
    
    msg = build_instant_alert_message(stats)
    await send_telegram_alert(msg)
    
    return {"status": "success", "message": "Instant alert sent!"}
