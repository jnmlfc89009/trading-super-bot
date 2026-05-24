#!/bin/bash

# Usage: Run this script by typing `./deploy.sh` in your terminal.
# Stop execution if any command fails
set -e

echo "🚀 Starting Super Trading Bot Deployment..."

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found! Cannot deploy without Telegram credentials."
  exit 1
fi

# Configuration
PROJECT_ID="trading-super-bot"
IMAGE_NAME="gcr.io/${PROJECT_ID}/super-trading-bot"

echo "📦 1. Building Docker image for Google Cloud Run (linux/amd64)..."
docker build --platform linux/amd64 -t $IMAGE_NAME .

echo "☁️ 2. Pushing image to Google Container Registry..."
docker push $IMAGE_NAME

echo "🚀 3. Deploying to Google Cloud Run..."
gcloud run deploy super-trading-bot \
  --image $IMAGE_NAME \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars TELEGRAM_TOKEN="${TELEGRAM_TOKEN}",TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID}",APP_PASSCODE="${APP_PASSCODE:-97317982}"

echo "✅ Deployment Complete!"
