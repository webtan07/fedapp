# FED — Are you FED up? Get FED.

A consumer wellness web app for people 40+ (and 40+ nervous systems in general),
built around three pillars — **F**asting, **E**xercise, **D**iet.

> Marketing line: **"Are you FED up? Get FED."** The product/app is called **FED**
> (all caps, no "app" suffix). `fedapp` is only the GitHub repo name, a container.

## Core loop
Quiz ("Are you FED up?") → Diagnosis (FED score + profile) → Personalized FED
Plan → Daily Check-in (4 screens) → Upgrade to Community.

## Stack
- TanStack Start (React + Vite + Tailwind v4)
- Neon serverless Postgres (`@neondatabase/serverless`)
- Vercel deploy (Build Output API, see `build-vercel.sh`)

## Local dev
```bash
cp .env.example .env   # paste your DATABASE_URL
bun install
bun run dev            # serves on PORT, default 3101
bun run build          # production build -> dist/
bun run start          # serve the built app on 3101
bun run typecheck      # tsc --noEmit
```

The server binds to **PORT (default 3101)** — never 3000 (WDA site) or 3100 (IG app).

## Database
All FED tables live in a dedicated Postgres schema named **`fed`** (same Neon
account as instagram-automation, but fully separated — its `public` tables are
untouched). The schema self-heals via `ensureSchema()` on first use (idempotent
DDL + seed rows). Verified via the healthcheck:

- Server function: `getHealth()` in `src/routes/api/health.ts`
- Page: `GET /health` → `{ ok: true, schema: true, tables: [...] }`

Tables created in `fed`:
`users`, `quiz_attempts`, `quiz_answers`, `profiles`, `checkins`,
`fasting_sessions`, `moves`, `plates`, `plan_access`.

## Routes
| Path | Purpose |
|------|---------|
| `/` | Landing / quiz-landing |
| `/result` | Result + sales page (placeholder) |
| `/health` | Healthcheck page (DB connectivity) |
| `/app` | Paywalled app home (plan) |
| `/app/fasting` | Fasting Timer screen |
| `/app/move` | Today's Move screen |
| `/app/plate` | Today's Plate screen |
| `/app/tracker` | Tracker screen |

## Compliance
The landing page includes a prominent medical disclaimer footer: FED is a
general wellness product, not medical advice — consult your doctor before
changing your diet, fasting, or exercise routine.
