# Lumina Expense Tracker - Setup Guide

Welcome to the definitive setup guide for the **Lumina Expense Tracker**. This project is structured as a **monorepo**, combining a robust Node.js backend with two beautifully designed Next.js frontends (Web App and Admin Portal).

## 🏗 Directory Structure

- `/server` - Node.js Express Backend with MongoDB/Mongoose.
- `/apps/web` - Next.js 16 Web Application (Mobile-first PWA).
- `/apps/admin` - Next.js 16 Admin Dashboard.

---

## 💻 Local Development Setup

### 1. Prerequisites
Ensure you have the following installed on your local machine:
- Node.js (v18 or higher)
- NPM or PNPM
- A MongoDB Cluster (local or MongoDB Atlas)

### 2. Backend Setup (`/server`)
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```

**Environment Variables:** Create a `.env` file in the `/server` directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.xyz.mongodb.net/lumina
JWT_SECRET=supersecret_jwt_key
SMTP_HOST=smtp.zoho.in
SMTP_PORT=465
SMTP_USER=your_email@domain.com
SMTP_PASS=your_app_password
```

Start the backend:
```bash
npm run dev
```
*(The backend runs on http://localhost:5000)*

### 3. Web App Setup (`/apps/web`)
Navigate to the web app directory and install dependencies:
```bash
cd apps/web
npm install
```

**Environment Variables:** Create a `.env.local` file in `/apps/web`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```
*(The Web app runs on http://localhost:3000)*

### 4. Admin Portal Setup (`/apps/admin`)
Follow the exact same frontend process as above:
```bash
cd apps/admin
npm install
```
Create `.env.local` with the same `NEXT_PUBLIC_API_URL`, then run `npm run dev` to launch it (it will likely start on http://localhost:3001).

---

## 🚀 Production Deployment Guide

We utilize a split deployment strategy to maximize performance and minimize hosting costs:

### Step 1: Deploy Backend to Render (render.com)
1. Sign in to Render and create a **New Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build` *(Crucial: Ensures TypeScript compilation)*
   - **Start Command:** `npm start`
4. Add all environment variables from your local `.env` into the Render dashboard.
5. Deploy and copy the resulting URL (e.g., `https://lumina-xyz.onrender.com`).

### Step 2: Deploy Frontend to Vercel (vercel.com)
1. Sign in to Vercel and **Add New Project**.
2. Import the GitHub repository.
3. Set **Root Directory** to `apps/web`.
4. In Environment Variables, add:
   - `NEXT_PUBLIC_API_URL` = `https://lumina-xyz.onrender.com/api` (Remember to append `/api`).
5. Click **Deploy**.

*(Repeat Step 2 and use `apps/admin` as the root directory to deploy the administrative console to its own URL).*

---

## 📱 Progressive Web App (PWA) Features

The Web App acts as a highly immersive mobile app.
1. When opening the deployed Vercel URL on mobile Safari or Chrome, tap **Share -> Add to Home Screen** (iOS) or select the Installation Prompt (Android).
2. The app uses specially engineered `manifest.ts` settings, `viewport` metadata, and dynamically sized SVG icons (`/public/icon-192x192.svg`) to render in **Standalone** mode.
3. This eliminates all browser UI (tabs, search bar) giving users a beautifully fluid native application experience.
