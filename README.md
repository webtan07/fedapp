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
| `/result` | Result + sales page (email gate → score/profile reveal → 3 teaser moves → Get FED paywall CTA) |
| `/health` | Healthcheck page (DB connectivity) |
| `/app` | Paywalled app home (plan) |
| `/app/fasting` | Fasting Timer screen |
| `/app/move` | Today's Move screen |
| `/app/plate` | Today's Plate screen |
| `/app/tracker` | Tracker screen |

## Paywall & purchase activation
- The "Get FED" CTA on the result/sales page and the app lock screen opens the
  real $19 founding checkout (`https://buy.stripe.com/9B6cN55uE6Ke7xrau82go00`
  — src/site.ts `STRIPE_PAYWALL_URL`, overridable via `PAYWALL_URL`).
- **Unlock handoff (v1):** our managed one-time payment link provides no Stripe
  webhook/secret, so a successful purchase is not auto-detected. A returning
  buyer opens the app's lock screen and enters the email they paid with;
  `unlockWithEmail` (src/routes/api/app.ts) grants `plan_access` for that email
  (`grantPlanAccess`, src/db/db.ts). **This is an honor-system activation** — we
  cannot verify the purchase server-side. The path to verified automatic
  activation is a real Stripe webhook once the owner's own Stripe keys exist.

## Deploy (Vercel, Build Output API — CLI --prebuilt only)
Do NOT `vercel link` / git-connect (git auto-builds have hijacked aliases on
our other apps). Build + deploy from the working tree:
```bash
VERCEL_TOKEN=<team token> bash deploy.sh   # builds .vercel/output, deploys, prints LIVE url
```
Equivalently: `bash build-vercel.sh` then
`bunx vercel deploy --prebuilt --yes --name fedapp --scope webina \
  -e DATABASE_URL="$DATABASE_URL" -e PAYWALL_URL="$PAYWALL_URL"`.
The production alias (`https://fedapp-*.vercel.app`) is the public URL. Make the
project public to drop the login wall. Env vars are baked in per-deployment;
change them and redeploy.

## Compliance
The landing page includes a prominent medical disclaimer footer: FED is a
general wellness product, not medical advice — consult your doctor before
changing your diet, fasting, or exercise routine.

## PWA installability
FED is installable to a phone/desktop home screen (no app store):
- `public/manifest.webmanifest` — name/short_name "FED", `display: standalone`,
  brand `theme_color` (#FF8A5C) + `background_color` (#FFF4E6), icons 192/512
  (plus a `maskable` 512) generated from the designer's 1024×1024
  `public/static/fed-icon.png`.
- `public/sw.js` — lightweight service worker: network-first for navigations
  (offline fallback to the cached shell), stale-while-revalidate for static
  assets. Registered in `src/routes/__root.tsx` on the client.
- `src/components/install-prompt.tsx` — small "Add FED to your home screen"
  pill surfaced via `beforeinstallprompt`; appears only when the browser makes
  the site installable, disappears on install/dismiss.
- Icons: `public/static/fed-icon-{180,192,512}.png` (apple-touch-icon /
  manifest icons). Re-generate from `fed-icon.png` if the brand icon changes.

