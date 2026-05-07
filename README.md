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

## Deploy to Vercel (free hosting)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-deploys on every push to main

## Create your first admin user

In Supabase dashboard → **Authentication → Users → Invite user**, enter an email address. The user will receive a link to set their password.

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
