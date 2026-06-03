# MamaOut

Activities app for mothers on maternity leave in Tel Aviv & Ramat Gan.

React + Vite + Tailwind frontend. Supabase database. Node.js scraper powered by Claude for classification.

---

## Quick start (frontend only)

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase credentials the app runs with built-in sample data.

---

## Environment setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Used by | Description |
|---|---|---|
| `SUPABASE_URL` | Scraper | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Scraper | Supabase anon/public key |
| `VITE_SUPABASE_URL` | Frontend | Same value as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Same value as `SUPABASE_ANON_KEY` |
| `ANTHROPIC_API_KEY` | Scraper | Anthropic API key for Claude classification |

---

## Database setup

1. Create a new [Supabase](https://supabase.com) project.
2. Open **SQL Editor → New query** and run the contents of `supabase/schema.sql`.
3. Copy your project URL and anon key from **Project Settings → API** into `.env`.

---

## Scraper

### Run once (manual / testing)

```bash
node scraper/index.js
```

This immediately scrapes all four sources (DuckDuckGo search, Eventbrite, Time Out Tel Aviv, GoOut), classifies each result with Claude Haiku, deduplicates against the database, and inserts new activities.

### Run on a schedule (production)

```bash
node scraper/scheduler.js
```

Runs one scrape immediately on startup, then again every day at **03:00 Israel time**. Keep the process alive with a process manager:

```bash
# with PM2
pm2 start scraper/scheduler.js --name mamaout-scraper
pm2 save

# or just keep the terminal open / use a systemd service
```

### How it works

1. **Four scrapers** hit DuckDuckGo search (Hebrew + English queries), Eventbrite Israel, Time Out Tel Aviv, and GoOut.co.il.
2. **Claude Haiku** classifies each raw result: assigns a category, estimates price range and minimum baby age, and flags irrelevant results for skipping.
3. **Deduplication** — each `source_url` is unique in the database; the scraper checks before inserting.
4. Results land in the `activities` Supabase table and appear in the app on next page load.

### Scraper output example

```
[scraper] Starting scrape — 2025-01-15T03:00:00.000Z
[scraper] Scraping DuckDuckGo/Google…
[scraper]   → 42 raw results
[scraper] Scraping Eventbrite…
[scraper]   → 8 raw results
...
[scraper]   + "Yoga with Baby — Sarona" (movement)
[scraper]   + "Postpartum Pilates" (movement)
[scraper] Done.
  Inserted:   12
  Duplicates: 31
  Irrelevant: 9
  Errors:     0
```

---

## Frontend

```bash
npm run dev      # development
npm run build    # production build → dist/
npm run preview  # preview production build
```

When `VITE_SUPABASE_URL` is set, the app fetches live activities from Supabase on load and shows a "live" indicator. Filtering and search run client-side on the fetched data. If Supabase is unavailable, the app silently falls back to built-in sample activities.

---

## Deploy to Vercel

```bash
npx vercel --prod
```

Set the `VITE_*` environment variables in your Vercel project settings (**Settings → Environment Variables**).
