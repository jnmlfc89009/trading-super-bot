# 📈 Super Trading App

A full-stack algorithmic statistical arbitrage and cointegration platform. Features a React + Vite dashboard and a Python FastAPI backend that tracks pairs, calculates rolling Z-scores and cointegration (ADF p-values), and supports automated Telegram notifications.

---

## 🏗️ Architecture

* **Frontend**: React + Vite single-page application with real-time charting (Recharts), research sandbox, and multi-compare equity curve visualizer.
* **Backend**: Python FastAPI service (`api/index.py`) using `statsmodels` for Engle-Granger Cointegration tests and `yfinance` for market data feeds.
* **Alerting**: Telegram Bot integration for push notifications and instant divergence alerts.
* **Persistence**: Firestore client integration for saving tracked pairs.

---

## 🔒 Security & Git Configuration

* **Passcode Lock Removed**: The application formerly required an `X-Passcode` header (`97317982`). Both the frontend gatekeeper and backend verification have been completely removed for open access.
* **Credential Safety**:
  * Local `.env` is ignored via `.gitignore` and is never tracked in git.
  * Verified: No API keys or tokens exist in git history or tracked repository files.
* **GitHub Multi-Account Routing**:
  * Configured with a dedicated SSH host alias (`github-personal`) using an isolated ED25519 key (`~/.ssh/id_ed25519_personal`).
  * Local git author is locked to `Jasel <jnmlfc89009@gmail.com>`.
  * Completely isolated from work/company GitHub credentials with zero cross-over.

---

## ⚙️ Current Operational Status

* **Status**: **Archived / Code Preserved**.
* **Live Cloud Deployment**: All cloud hosting (Google Cloud Run `super-trading-bot`, Cloud Scheduler `daily-stat-arb-scan`, and Vercel) has been decommissioned.
* **Repository**: Main branch on [github.com/jnmlfc89009/trading-super-bot](https://github.com/jnmlfc89009/trading-super-bot) contains the clean, fully functional codebase.

---

## 💻 Local Development Setup

To run the application locally on your Mac:

### 1. Backend (FastAPI)
```bash
# In project root
python3 -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt

# Run server on port 8080
uvicorn api.index:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Frontend (Vite)
```bash
# In project root
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
