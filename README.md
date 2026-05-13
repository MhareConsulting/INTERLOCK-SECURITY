# Interlock Security — Field Operations Dashboard

A full-stack field operations dashboard for Interlock Security: job management, technician tracking, GPS, job cards, photo upload, client signatures, and reports.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Database + API | Supabase (PostgreSQL + PostgREST) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Maps | Leaflet + OpenStreetMap |
| Hosting | Vercel |

All free tier — no cost to get started.

## Quick Start (demo mode)

```bash
npm install
npm run dev
```

The app runs in demo mode with seed data. No Supabase needed to explore the UI.

## Connect to Supabase (persistence)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run `supabase/schema.sql`
3. Go to **Settings → API** and copy your URL and anon key
4. Copy `.env.example` to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```
5. Restart the dev server — data now persists in PostgreSQL

**Android / Capacitor login issues:** If email/password sign-in fails with “cannot reach server” but the URL is correct in `dist`, set `auth.detectSessionInUrl: false` for native (already done in `src/lib/supabase.ts`). If it still fails, use the **legacy `anon` `public` JWT** from Supabase **Settings → API** as `VITE_SUPABASE_ANON_KEY` (starts with `eyJ…`) instead of `sb_publishable_…`, then rebuild the APK.

## Deploy to Vercel (free hosting)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-deploys on every push to main

## Create your first admin user

In Supabase dashboard → **Authentication → Users → Invite user**, enter an email address. The user will receive a link to set their password.

## Installing the Android APK (team / sideload)

The same APK can behave differently per phone because of **manufacturer settings** and **which app opened the download** (Chrome, WhatsApp, Gmail, Google Drive, Outlook, etc.). None of that is fixed by “an APK installer” in the long term — that app is only working around a permission or a broken file association.

**Before opening the APK**

1. Confirm the saved file name ends in **`.apk`** (not `.bin`, `.zip`, or “Document”). If it does not, re-download from a link that serves the file as `Something.apk`, or rename to `.apk` after download if you are sure the file is intact.
2. On the phone: **Settings → Apps → Special app access** (or **Security**) → **Install unknown apps** (or **Install other apps**) → find the app they used to **download or store** the file (e.g. Chrome, Files, WhatsApp, Drive) → **Allow**.

**If tapping the APK does nothing or only offers “Open with…”**

- Open **Files** / **My Files**, browse to **Downloads**, tap the APK there. Samsung and Pixel usually install fine from here.
- On **Xiaomi / Redmi / POCO (MIUI/HyperOS)**: allow the **browser or File manager** you used; some builds are strict until that toggle is on.
- On **Huawei** (without Google): sideloading is more restricted; prefer **internal distribution** (below) or Huawei’s enterprise channels.

**Play Protect**

If Google shows **“Blocked by Play Protect”**, use **“Install anyway”** only if everyone trusts this build, or switch to an **internal testing** track so installs go through Play (see below).

**Better options for a whole team (recommended)**

- **Google Play — Internal testing**: upload an **AAB**, add testers by email; they install from Play Store (no “unknown sources” maze, fewer OEM quirks).
- **Firebase App Distribution**: upload builds; testers get an email link with a guided install.

Bump **`versionCode`** in `android/app/build.gradle` for every new APK you ship so Android does not treat updates as a downgrade.

## Features

- **Dashboard** — today's job stats, recent jobs
- **Jobs** — create, filter, search, manage all jobs
- **Technicians** — roster with job counts and status
- **GPS Tracking** — live Leaflet map (OpenStreetMap), technician pins, location history
- **Job Cards** — filter by technician, search
- **Job Detail** — 4 tabs: details, GPS, photo upload (up to 6), client signature capture
- **Reports** — bar charts: by status, technician, type, priority
- **Auth** — Supabase Auth with email/password, sign out

## Project Structure

```
src/
├── components/   # Shared UI components
├── hooks/        # useJobs, useTechnicians — data + Supabase
├── lib/          # supabase.ts client
├── pages/        # Dashboard, Jobs, Technicians, GPSTracking, JobCards, Reports, Login
├── types/        # TypeScript interfaces
supabase/
└── schema.sql    # Full PostgreSQL schema + seed data
```
