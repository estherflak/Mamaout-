# MamaOut

Activities app for mothers on maternity leave with babies aged 0–12 months in the
Tel Aviv metro area (Gush Dan). Bilingual UI — English (LTR) and Hebrew (RTL).

React + Vite + Tailwind frontend. Supabase database. Two Node.js scraping pipelines
(Vercel crons + GitHub Actions) with Claude for classification and translation.

---

## Setup (no local dev needed)

### 1. Database
1. Create a new [Supabase](https://supabase.com) project.
2. Open **SQL Editor → New query** and run `supabase/schema.sql`, then each
   `supabase/migrations/*.sql` in version order — see `supabase/README.md`.
3. Find your credentials at **Project Settings → API**: the **Project URL**, the
   **anon / public** key, and the **service_role** key.

### 2. Scraper (runs automatically via GitHub Actions)
Add these secrets to your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key (bypasses RLS; writes require it since migration_v15) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |

The workflow runs daily at **05:15 UTC** — deliberately *after* the Vercel scrape
crons (01:00–05:00 UTC) so its backfill steps repair the rows those crons just
inserted. To trigger it manually: **Actions → Daily Scraper → Run workflow** (you can
also run just one job: `backfill-translations`, `backfill-coords`, or `cleanup-past`).

### 3. Frontend + cron scrapers (deployed via Vercel)
Add these environment variables in your Vercel project under **Settings → Environment Variables**
(see `.env.example` for the full annotated list):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Same as your Supabase anon key |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | For the `api/cron/*` scrapers and the reminder email |
| `CRON_SECRET` | Random string; protects the cron endpoints |

Then **Deployments → Redeploy**. The app will start reading activities from Supabase.

---

## How it works

Two scraping pipelines write into the same Supabase `activities` table
(deduplicated by `source_url` and a content `dedup_key`):

1. **Vercel crons** (`api/cron/scrape-*.js`, schedules in `vercel.json`, 01:00–05:00 UTC)
   scrape structured sources directly — Coing (Tel Aviv community centers), Arbox
   studios, Ramat Gan municipality, TLV Digitaf, and SmartTicket tenants. They insert
   raw Hebrew rows with keyword-based relevance filtering (no Claude call).
2. **GitHub Actions** (`.github/workflows/scraper.yml`, 05:15 UTC) runs
   `scraper/index.js` over the sources that need **Claude Haiku** classification
   (Beit Emanuel, TLV Digitaf, Ramat Gan municipality, Mommy Jogger), then runs three
   repair passes over *all* rows: English translation backfill, coordinates backfill,
   and past-event cleanup.
3. The **Vercel** frontend fetches activities on load and filters out anything
   expired or aimed at babies older than 12 months. There is no sample-data fallback
   in production — if Supabase is unreachable the app shows an error banner. Mock
   data appears only in local dev when no Supabase env vars are configured.

## Daily reminder email

`api/cron/send-reminders.js` runs every morning (06:00 UTC) and emails each mom a
digest of the activities she saved or RSVP'd that happen **that day**. It's opt-in
(Profile → Notifications → Email reminders) and de-duped via the `reminders_sent`
table (created in `supabase/migrations/migration_v12.sql`).

To enable, set these env vars in Vercel: `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, and optionally `REMINDER_FROM`, `APP_URL`, `CRON_SECRET`
(see `.env.example`). Without `RESEND_API_KEY` the cron no-ops safely.

## Local development

```bash
npm install
npm run dev        # Vite dev server; without .env.local it shows mock data
npm run lint       # eslint
node scraper/index.js   # one-off scrape (needs .env.local with Supabase + Anthropic keys)
```
