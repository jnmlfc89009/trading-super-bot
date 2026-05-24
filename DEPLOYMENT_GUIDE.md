# Cloud Run & yfinance Pivot Walkthrough

The Super App has been successfully migrated back to `yfinance` to unlock free, unlimited historical data for global equities, including the Singapore Exchange (SGX). 

We have also prepared the codebase for deployment to **Google Cloud Run** to ensure `yfinance` never gets blocked by aggressive anti-bot algorithms.

## What Changed?
1. **The Data Engine:** I ripped `tiingo` out of `api/requirements.txt` and `api/index.py` and replaced it with `yfinance`. The engine now effortlessly downloads data for tickers like `D05.SI` (DBS Bank) directly from Yahoo Finance.
2. **No More API Keys:** I removed all requirements for the `TIINGO_API_KEY`. You only need your Telegram credentials in the `.env` file!
3. **The Dockerfile:** I created a `Dockerfile` in your project root. This is the exact blueprint Google Cloud Run needs to build a virtual server, install Python 3.11, install your requirements, and boot up the FastAPI server on port 8080.

---

## Deployment Education: How to Deploy to Google Cloud Run

Deploying a Docker container to Google Cloud Run is considered one of the most powerful skills in modern backend engineering. Here is exactly how you will deploy this application once you are ready.

### Prerequisites
1. Create a Google Cloud Account and install the `gcloud` CLI tool on your Mac.
2. Run `gcloud auth login` in your terminal to connect your Google account.
3. Ensure you have Docker Desktop installed on your Mac.

### Step 1: Build the Container
In your terminal, navigate to your `Super Trading App` folder and tell Docker to build the image (the "shipping box") using the blueprint I wrote:
```bash
docker build -t gcr.io/YOUR_PROJECT_ID/super-trading-bot .
```

### Step 2: Push to Google Container Registry
Upload that "shipping box" to Google's secure storage so Cloud Run can access it:
```bash
docker push gcr.io/YOUR_PROJECT_ID/super-trading-bot
```

### Step 3: Deploy to Cloud Run
Finally, tell Cloud Run to spin up a server using your image. 
```bash
gcloud run deploy super-trading-bot \
  --image gcr.io/YOUR_PROJECT_ID/super-trading-bot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars TELEGRAM_TOKEN=your_token_here,TELEGRAM_CHAT_ID=your_chat_id_here
```

> [!SUCCESS]
> **That's it!** Google will return a public URL (e.g., `https://super-trading-bot-xyz.a.run.app`). You will then update your React frontend to point to this new URL instead of `localhost:8000`, and deploy your React app to Vercel completely for free!

---

## Setting up the Automated 9 AM Trigger (Google Cloud Scheduler)

Because Cloud Run goes to sleep when no one is using it, you need an "alarm clock" to ping the server every morning to trigger your daily stat arb scan. 

Once your backend is successfully deployed, run this command in your terminal to create a **Google Cloud Scheduler** job. It will ping your server at exactly 9:00 AM Singapore time (UTC+8) every Monday through Friday (`0 9 * * 1-5`):

```bash
gcloud scheduler jobs create http daily-stat-arb-scan --schedule="0 9 * * 1-5" --time-zone="Asia/Singapore" --location="us-central1" --uri="https://super-trading-bot-105897008393.us-central1.run.app/api/scan?send_telegram=true" --http-method=GET --headers="X-Passcode=97317982"
```

*(Note: If your terminal asks you to enable the Cloud Scheduler API, just press `y` and hit Enter!)*
