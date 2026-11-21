# Super Trading App - Phase 3 Expansion Plan

This document outlines the strategic roadmap for upgrading the Super Trading App into an institutional-grade quantitative trading platform. 

## 1. Robust Backtesting Engine (Priority: High)
**Goal:** Simulate trades over historical data to validate strategy robustness before risking real capital.

### Implementation Steps
- **Backend (FastAPI):** 
  - Create a new endpoint `/api/backtest`.
  - Fetch 3-5 years of historical data for the requested pair.
  - Run a historical simulation using the Z-Score and Cointegration logic.
  - Calculate key metrics: **Sharpe Ratio**, **Maximum Drawdown**, **Win/Loss Ratio**, **Total Return**, and a time-series of the simulated equity curve.
- **Frontend (React):** 
  - Add a "Run Backtest" button to the Research Hub UI.
  - Display the backtest results using `Recharts` for the equity curve and stat cards for the metrics.
- **Database (Firestore):** 
  - Cache backtest results to prevent redundant expensive API calls.

## 2. Fundamental Shock Prevention (Priority: Medium)
**Goal:** Prevent the bot from trading a pair if there is a major fundamental event (e.g., M&A, earnings shock) that permanently breaks cointegration.

### Implementation Steps
- **Backend Integration:** 
  - Integrate a News API (e.g., NewsAPI, Alpaca News) or an LLM (e.g., OpenAI/Gemini API).
  - Before a `Z-Score > 2.0` fires a signal, fetch the last 48 hours of headlines for both tickers.
- **Logic:** 
  - Use sentiment analysis to classify the news. If "extreme negative" or keywords like "fraud, acquired, resigns" are detected, flag the pair as `HALTED`.
- **Telegram Alert:** 
  - Send an alert: *"Signal detected, but blocked due to high-risk news event on [Ticker]."*

## 3. Market Regime Detection & Dynamic Thresholds (Priority: Medium)
**Goal:** Adapt the Z-Score entry threshold based on the broader market's volatility to avoid being run over during market crashes.

### Implementation Steps
- **Backend Data Fetch:** 
  - Continuously track the **VIX** (Volatility Index) or calculate the Average True Range (ATR) of the S&P 500.
- **Dynamic Logic:** 
  - **Low Volatility (VIX < 15):** Tighten entry Z-Score to `1.5` to capture frequent small reversions.
  - **Normal Volatility (VIX 15-25):** Standard entry Z-Score at `2.0`.
  - **High Volatility (VIX > 25):** Widen entry Z-Score to `3.0` to account for extreme momentum, or halt trading entirely.
- **Frontend Tracking:** 
  - Add a "Market Regime" indicator to the React dashboard header.

## 4. Live Broker Execution Integration (Priority: Low - Advanced)
**Goal:** Move from manual execution to automated "One-Click" or fully algorithmic execution via a brokerage API.

### Implementation Steps
- **Broker Selection:** 
  - Create an account with an API-friendly broker (e.g., Alpaca for easy REST APIs, or Interactive Brokers).
- **Backend Execution Service:** 
  - Build a secure service in FastAPI to generate and sign order requests.
  - When a pair triggers, calculate the exact share quantity for both legs (Hedge Ratio) based on a defined capital allocation (e.g., $10,000 per trade).
  - Route a Market or Limit Order to the broker API.
- **Phased Rollout:** 
  - **Phase A:** Paper Trading only (simulated execution).
  - **Phase B:** One-Click execution from the React Dashboard.
  - **Phase C:** Fully automated execution via the Cloud Scheduler End-of-Day scan.

## 5. Basket Trading via PCA (Priority: Low - Advanced)
**Goal:** Expand beyond 1-vs-1 pairs trading to 1-vs-Basket to diversify idiosyncratic risk.

### Implementation Steps
- **Advanced Math Engine:** 
  - Integrate `scikit-learn` into the FastAPI backend.
  - Use Principal Component Analysis (PCA) to extract the primary driving factors of a sector (e.g., XLF for financials).
- **Trading Logic:** 
  - Long one undervalued stock (e.g., JPM) and Short a weighted basket of its peers (e.g., BAC, C, WFC) based on their PCA factor loadings.
- **UI Update:** 
  - Update the React Dashboard to handle multiple tickers in a single "Trade Group" rather than just a pair.
