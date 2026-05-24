# Google Firestore Implementation Plan

To make your pairs permanent on a serverless architecture, we are going to integrate **Google Firestore**. Firestore is a highly scalable NoSQL cloud database. 

Because we are deploying your backend to Google Cloud Run, we have a massive advantage: we don't need to mess around with complex API keys or passwords. Google Cloud Run automatically grants your Python code permission to talk to your Firestore database because they live in the same project!

## 1. Code Changes
I will modify the Python backend to rip out the `pairs.json` text file logic and replace it with the official `firebase-admin` SDK.
* **Additions:** Add `firebase-admin` to `api/requirements.txt`.
* **Refactoring `api/index.py`:** Update the `load_pairs()`, `add_pair()`, and `delete_pair()` functions to communicate directly with a Firestore collection named `pairs`. Every pair you track will become its own "Document" in the cloud database.

## 2. Your Setup Tasks (Google Cloud Console)
Before I write the code, you need to turn on the database in your Google Cloud project. It takes about 30 seconds:
1. Go to your [Google Cloud Console](https://console.cloud.google.com/) and ensure your `super-trading-bot` project is selected.
2. In the search bar at the top, type **Firestore** and click on it.
3. Click **Create Database**.
4. Select **Native mode** (this is the modern NoSQL mode).
5. Choose a location close to you (e.g., `asia-southeast1` for Singapore) and click **Create Database**.

## 3. Local Authentication
Because we won't use hardcoded passwords, your local Mac needs permission to talk to your new database so you can test it locally. You will run this command in your terminal:
```bash
gcloud auth application-default login
```
This will open a browser window for you to log in, and it will securely grant your local Python code temporary access to your cloud database!

## Open Questions
> [!IMPORTANT]
> The beauty of Firestore is that it is completely free for up to 50,000 document reads per day. Once you have clicked "Create Database" in your Google Cloud Console, let me know, and I will begin writing the Python code to connect to it! Do you have any questions before we proceed?
