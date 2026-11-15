# Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide walks you through deploying the **School Management System**:
- **Backend API (Express + Prisma + SQLite)** on [Render](https://render.com)
- **Frontend SPA (React + Vite + Tailwind)** on [Vercel](https://vercel.com)

---

## Part 1: Deploy Backend on Render

### Step 1: Create a Render Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `School-Management-System`.

### Step 2: Configure Service Settings
Fill in the following settings:
- **Name**: `school-management-server` (or any name you choose)
- **Region**: Closest to you (e.g., *Singapore*, *Frankfurt*, or *Oregon*)
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### Step 3: Add Environment Variables
In the **Environment Variables** section on Render, add:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `10000` | Render default port |
| `DATABASE_URL` | `file:./dev.db` | Local SQLite database |
| `JWT_SECRET` | *(Click "Generate" or type a 32+ character random string)* | Used to sign JWT auth tokens |
| `JWT_EXPIRES_IN` | `7d` | Token validity duration |
| `BCRYPT_ROUNDS` | `10` | Password hashing complexity |
| `SCHOOL_TIMEZONE` | `Asia/Kolkata` | School local timezone |
| `CLIENT_ORIGIN` | `http://localhost:5173` | *You will update this with your Vercel URL in Part 3* |

### Step 4: Deploy & Verify
1. Click **Deploy Web Service**.
2. Wait for the build and seed process to finish. You should see logs like:
   ```text
   Database schema is up to date!
   Database seeded successfully.
   Server running on port 10000 [production]
   ```
3. Copy your Render backend URL (e.g. `https://school-management-server-xxxx.onrender.com`).
4. Test health check in your browser:
   `https://school-management-server-xxxx.onrender.com/api/health`
   You should see: `{"status":"ok", ...}`

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Import Project into Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository: `School-Management-System`.

### Step 2: Configure Build & Output Settings
In the Project Configuration screen:
- **Project Name**: `school-management-system`
- **Framework Preset**: `Vite`
- **Root Directory**: Click *Edit* and select `client`
- **Build Command**: `npm run build` *(auto-detected)*
- **Output Directory**: `dist` *(auto-detected)*

### Step 3: Add Frontend Environment Variable
Expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://school-management-server-xxxx.onrender.com` *(your Render backend URL from Part 1, without trailing slash)* |

### Step 4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will build the frontend and provide your live URL (e.g. `https://school-management-system.vercel.app`).
3. Open your Vercel URL. You should see the login page!

---

## Part 3: Connect Frontend & Backend (CORS)

1. Copy your live Vercel domain (e.g., `https://school-management-system.vercel.app`).
2. Go back to your [Render Dashboard](https://dashboard.render.com).
3. Select your `school-management-server` service > **Environment**.
4. Update `CLIENT_ORIGIN` to:
   ```text
   https://school-management-system.vercel.app
   ```
5. Click **Save Changes**. Render will automatically redeploy with the updated CORS origin.
   *(Note: The server also auto-allows any `*.vercel.app` domain by default).*

---

## Part 4: Default Seed Login Credentials

Once deployed, the database is pre-seeded with sample users for all 3 roles:

| Role | Email | Password | Landing Page |
|---|---|---|---|
| **Administrator** | `admin@school.demo` | `Admin@123` | `/admin/dashboard` |
| **Teacher** | `teacher1@school.demo` | `Teacher@123` | `/teacher/sections` |
| **Guardian** | `guardian1@school.demo` | `Guardian@123` | `/guardian/children` |

---

## Important Notes & Troubleshooting

### 1. Render Free Tier Spin-Down (Cold Start)
- Render's free tier spins down web services after 15 minutes of inactivity.
- When you first open the app after some time, the backend might take **30–50 seconds** to wake up.
- The UI handles loading states with spinners; once awake, subsequent requests respond immediately.

### 2. Client-Side SPA Routing
- `client/vercel.json` contains URL rewrite rules to ensure refreshing pages like `/admin/students` or `/teacher/attendance` directly won't return 404 errors.

### 3. API Docs
- Interactive Swagger UI documentation is available at:
  `https://your-backend.onrender.com/api-docs`
