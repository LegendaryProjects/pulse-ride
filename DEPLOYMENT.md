# ?? Pulse Ride - 100% Free Production Cloud Deployment Guide

This guide walks you through deploying **Pulse Ride** (Frontend, Backend, WebSockets, ML, and Database) using **100% Free Cloud Platforms** (Render, Vercel, Railway, Supabase/Neon).

---

## ?? Architecture Overview

| Component | Technology | Recommended Free Host | Alternative Free Host |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + Tailwind + Leaflet | **Vercel** (Fastest CDN) | **Render Static Site** |
| **Backend & WebSockets** | Node.js + Express + Socket.IO | **Render Web Service** | **Railway** |
| **Database** | PostgreSQL (or Zero-Config Mock) | **Supabase** or **Neon** | **Built-in In-Memory** |
| **ML Microservice** (Optional) | Python FastAPI + XGBoost | **Render Web Service** | Built-in Heuristic |

---

## ?? Step 1: Push Code to GitHub

Open terminal in the project root:

`ash
# 1. Check status and stage all files
git add .

# 2. Commit the changes
git commit -m "Pulse Ride - Full working version with 30s batching, camera QR scanning & routing"

# 3. Rename branch to main (if not already)
git branch -M main

# 4. If you haven't linked your GitHub repository yet:
# git remote add origin https://github.com/<your-username>/pulse-ride.git

# 5. Push to GitHub
git push -u origin main
`

---

## ??? Step 2: Database Setup (Free PostgreSQL)

> **Note:** If you want zero database setup, you can skip this step! The backend will automatically run on its high-speed in-memory database with pre-seeded demo drivers, vehicles, and campus nodes.

If you prefer a persistent PostgreSQL database:
1. Go to [Supabase (Free Tier)](https://supabase.com/) or [Neon.tech (Free Tier)](https://neon.tech/).
2. Create a new project named pulse-ride-db.
3. Copy your connection string URL (URI format):
   postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres
4. Run the schema migrations from ackend-node/src/db/seeds.js or through the Supabase SQL editor.

---

## ??? Step 3: Deploy Backend on Render (Free Web Service)

1. Sign up / Log in to [Render](https://dashboard.render.com/).
2. Click **New +** $\to$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your pulse-ride repo.
4. Configure the service:
   - **Name:** pulse-ride-backend
   - **Region:** Choose the region closest to you (e.g., Singapore, Frankfurt, Ohio)
   - **Root Directory:** ackend-node
   - **Runtime:** Node
   - **Build Command:** 
pm install
   - **Start Command:** 
ode src/server.js
   - **Instance Type:** Free
5. Click **Advanced** $\to$ **Add Environment Variable**:
   - PORT = 3000
   - JWT_SECRET = super_secret_pulse_ride_jwt_key_2026
   - DATABASE_URL = (Paste your Supabase/Neon PostgreSQL URL, or leave blank for zero-config in-memory)
   - ML_SERVICE_URL = (Leave blank to use built-in ML heuristic)
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g. https://pulse-ride-backend.onrender.com).

---

## ?? Step 4: Deploy Frontend on Vercel (Free Static Hosting)

Vercel provides lightning-fast global CDN edge hosting with automatic HTTPS.

1. Sign up / Log in to [Vercel](https://vercel.com/).
2. Click **Add New...** $\to$ **Project**.
3. Import your pulse-ride GitHub repository.
4. In the configuration screen:
   - **Project Name:** pulse-ride
   - **Framework Preset:** Vite
   - **Root Directory:** Click **Edit** and select rontend.
   - **Build Command:** 
pm run build
   - **Output Directory:** dist
5. Expand **Environment Variables** and add:
   - VITE_API_URL = https://pulse-ride-backend.onrender.com/api
   - VITE_SOCKET_URL = https://pulse-ride-backend.onrender.com
   *(Replace with your actual backend URL from Step 3)*
6. Click **Deploy**.
7. Your app is live at https://pulse-ride.vercel.app!

---

## ?? Step 5 (Optional): Deploy ML Microservice on Render

1. On [Render](https://dashboard.render.com/), click **New +** $\to$ **Web Service**.
2. Connect your repo and set:
   - **Name:** pulse-ride-ml
   - **Root Directory:** ml-python
   - **Runtime:** Python 3
   - **Build Command:** pip install -r requirements.txt
   - **Start Command:** uvicorn src.api.main:app --host 0.0.0.0 --port 8000
   - **Instance Type:** Free
3. Click **Deploy**.
4. If you deploy this, update your backend's ML_SERVICE_URL environment variable with this URL.

---

## ? Step 6: Verification & Post-Deployment Smoke Test

Once deployed, open your live Vercel URL on your phone or laptop:

1. **Driver Login**:
   - URL: https://pulse-ride.vercel.app
   - Credentials: driver@nitk.edu.in / password123
   - Click **Start Job** $\to$ Live status shows IDLE (Job Started. 30-second dispatch window active).

2. **Student Ride Booking (on Smartphone)**:
   - Open on smartphone: https://pulse-ride.vercel.app
   - Credentials: student@nitk.edu.in / password123
   - Book PickUp: LHC-C, DropOff: Mega Towers $\to$ Confirm Ride.
   - Live 30s countdown timer displays on screen.

3. **Live Dynamic Dispatch & Routing**:
   - At 30s expiry, route [LHC-C, Mega Towers] is pushed to the Driver.
   - Student receives "Your bus is coming! Vehicle KA-19-NITK-001 (Bus) is en route".

4. **Stop-by-Stop QR Verification**:
   - Driver clicks **Reached "LHC-C" Stop** $\to$ QR code displays.
   - Student taps **Scan QR Code**, scans with phone camera (or taps 1-tap verify) $\to$ Status becomes PICKED_UP.
   - Driver dashboard shows **Good to Go!** and advances to **Reached "Mega Towers" Stop**.
   - Driver clicks **Reached "Mega Towers" Stop** $\to$ Student scans dropoff QR $\to$ Trip finishes successfully!
