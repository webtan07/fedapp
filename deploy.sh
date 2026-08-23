#!/usr/bin/env bash
# Deploy FED to Vercel (Build Output API, CLI --prebuilt, no git integration).
#
#   VERCEL_TOKEN required (the team's Vercel token). DATABASE_URL + PAYWALL_URL
#   are read from ./.env automatically and baked into the deployment.
#   Run:  bash deploy.sh
# Prints the live https://<alias>.vercel.app URL ("LIVE:").
#
# Never `vercel link` / `git connect` this project — git auto-builds have
# hijacked production aliases on the team's other apps. CLI --prebuilt only.
set -euo pipefail
cd "$(dirname "$0")"
umask 002
: "${VERCEL_TOKEN:?set VERCEL_TOKEN (team Vercel token) to deploy}"
PROJECT_NAME="fedapp"
VERCEL="bunx vercel@latest"

# Load DB + paywall env from ./.env (do not print the secret).
set -a; . ./.env; set +a
: "${DATABASE_URL:?DATABASE_URL missing from ./.env}"

echo "==> building Vercel bundle (.vercel/output)"
bash ./build-vercel.sh

# Resolve the token's team scope (like WDA go-live.sh) so we deploy to the
# right org. 'webina' is the team slug; fall back to auto-resolve.
SCOPE="${VERCEL_SCOPE:-}"
if [ -z "$SCOPE" ]; then
  SCOPE="$(VERCEL_TOKEN="$VERCEL_TOKEN" bun -e '
    const h = { headers: { Authorization: "Bearer " + process.env.VERCEL_TOKEN } };
    const [u, tj] = await Promise.all([
      fetch("https://api.vercel.com/v2/user", h).then((r) => r.json()).catch(() => ({})),
      fetch("https://api.vercel.com/v2/teams?limit=50", h).then((r) => r.json()).catch(() => ({})),
    ]);
    const teams = tj.teams || [];
    const def = (u.user || u || {}).defaultTeamId;
    const t = teams.find((x) => x.id === def) || teams[0];
    if (t) process.stdout.write(t.slug);
  ' 2>/dev/null || true)"
fi
SCOPE_ARGS=()
if [ -n "$SCOPE" ]; then SCOPE_ARGS=(--scope "$SCOPE"); fi

echo "==> deploying (scope: ${SCOPE:-<personal>})"
# Production public URL for the emailed result link (local .env carries the
# http://localhost:3101 dev value — not usable in production emails).
: "${APP_BASE_URL:?APP_BASE_URL must be the production public URL for deploy}"
if [[ "$APP_BASE_URL" == *"localhost"* ]]; then
  APP_BASE_URL="https://fedapp-sepia.vercel.app"
fi
DEPLOY_OUT="$($VERCEL deploy --prebuilt --prod --yes --name "$PROJECT_NAME" "${SCOPE_ARGS[@]}" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e PAYWALL_URL="$PAYWALL_URL" \
  -e PORT="$PORT" \
  -e APP_BASE_URL="$APP_BASE_URL" \
  -e TESTER_CODE="$TESTER_CODE" \
  -e EMAIL_USER="$EMAIL_USER" \
  -e EMAIL_APP_PASSWORD="$EMAIL_APP_PASSWORD" \
  -e SMTP_HOST="$SMTP_HOST" \
  -e SMTP_PORT="$SMTP_PORT" \
  -e SMTP_SECURE="$SMTP_SECURE" 2>&1)" || {
  printf '%s\n' "$DEPLOY_OUT" >&2
  exit 1
}
printf '%s\n' "$DEPLOY_OUT"
LIVE_URL="$(printf '%s\n' "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | tail -1)"
if [ -z "$LIVE_URL" ]; then
  echo "deploy finished but no live URL parsed — output above" >&2
  exit 1
fi

echo "==> making the project public (drop SSO/login wall)"
TEAM_QS=""
if [ -n "${SCOPE:-}" ]; then
  TEAM_QS="?teamId=$SCOPE"   # scope here is slug; API also accepts slug via --scope handled above
fi
curl -sf -X PATCH "https://api.vercel.com/v9/projects/${PROJECT_NAME}${TEAM_QS}" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection":null}' >/dev/null || true

echo "LIVE: $LIVE_URL"
