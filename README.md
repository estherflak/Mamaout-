# MamaOut

Activities app for mothers on maternity leave in Tel Aviv & Ramat Gan.

React + Vite + Tailwind frontend. Supabase database. Node.js scraper powered by Claude for classification.

---

## Setup (no local dev needed)

### 1. Database
1. Create a new [Supabase](https://supabase.com) project.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
3. Find your credentials at **Project Settings → API**: the **Project URL** and **anon / public** key.

### 2. Scraper (runs automatically via GitHub Actions)
Add these three secrets to your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / public key |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

The scraper runs automatically every night at 03:00 Israel time. To trigger it manually: **Actions → Daily Scraper → Run workflow**.

### 3. Frontend (deployed via Vercel)
Add these two environment variables in your Vercel project under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same as your Supabase anon key |

Then **Deployments → Redeploy**. The app will start reading activities from Supabase.

---

## How it works

1. **GitHub Actions** runs the scraper daily — hits DuckDuckGo (Hebrew + English), Eventbrite, Time Out Tel Aviv, and GoOut.co.il.
2. **Claude Haiku** classifies each raw result: assigns a category, estimates price and baby age, and filters out irrelevant listings.
3. New activities land in the **Supabase** `activities` table.
4. The **Vercel** frontend fetches them on load. Falls back to built-in sample data if Supabase is unreachable.
