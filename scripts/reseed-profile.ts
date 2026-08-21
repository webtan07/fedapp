/**
 * One-time re-seed + verify for the FED profiles in the live Neon `fed` schema.
 *
 * The cortisol-crash profile description was rewritten in PR #5 to honest,
 * non-quasi-medical copy ("...running on empty instead of on steady fuel..."),
 * but rows seeded by an older schema version keep their old copy — the seed
 * re-insert only corrects a row when it actually runs. This script runs the
 * canonical ensureSchema() (which upserts SEED_PROFILES with ON CONFLICT DO
 * UPDATE), then confirms the live row holds the new copy.
 *
 * Run from the repo root with the DB url from .env:
 *   set -a; . ./.env; set +a; bun run scripts/reseed-profile.ts
 * Exits non-zero if the cortisol-crash row still holds the OLD copy.
 */
import { ensureSchema, getProfileBySlug } from "../src/db/db";

const OLD_FRAGMENTS = ["stress hormones", "running on cortisol"];
const NEW_MARKER = "running on empty instead of on steady fuel";

async function main(): Promise<void> {
  console.log("Running ensureSchema() (creates schema + re-seeds profiles)…");
  await ensureSchema();

  const p = await getProfileBySlug("cortisol-crash");
  if (!p) {
    console.error("FAIL: cortisol-crash profile not found in fed.profiles");
    process.exit(1);
  }
  console.log("cortisol-crash description now:\n  " + p.description);

  const stillOld = OLD_FRAGMENTS.some((f) => p.description.includes(f));
  const hasNew = p.description.includes(NEW_MARKER);
  if (stillOld || !hasNew) {
    console.error(
      "FAIL: cortisol-crash description is NOT the new honest copy" +
        (stillOld ? " (still contains old quasi-medical wording)" : ""),
    );
    process.exit(1);
  }
  console.log("OK: cortisol-crash re-seeded to the new honest copy.");
}

main().catch((e) => {
  console.error("reseed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
