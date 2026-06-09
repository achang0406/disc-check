/**
 * Phase 2b-ii — read-only checks: game_push_state headcount vs live RSVPs.
 * Usage: npm run verify:2b-ii-push-state
 * Optional: VERIFY_GAME_ID=g1 npm run verify:2b-ii-push-state
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameIdFilter = process.env.VERIFY_GAME_ID?.trim() || null;

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sumHeadcount(rsvps) {
  return rsvps.reduce((total, row) => total + 1 + (row.plus_ones ?? 0), 0);
}

async function main() {
  const { error: tableError } = await supabase.from("game_push_state").select("game_id").limit(1);
  assert(!tableError, `game_push_state not reachable: ${tableError?.message ?? "unknown"}`);

  let gamesQuery = supabase
    .from("games")
    .select("id, name, rsvp_cycle_at, status")
    .not("rsvp_cycle_at", "is", null);

  if (gameIdFilter) {
    gamesQuery = gamesQuery.eq("id", gameIdFilter);
  }

  const { data: gamesData, error: gamesError } = await gamesQuery;
  assert(!gamesError, `games query failed: ${gamesError?.message ?? "unknown"}`);
  const games = gamesData ?? [];
  assert(games.length > 0, gameIdFilter ? `game not found: ${gameIdFilter}` : "no games with rsvp_cycle_at");

  let checked = 0;
  let mismatches = 0;
  let missingCurrentRow = 0;

  for (const game of games) {
    const { data: rsvps, error: rsvpError } = await supabase
      .from("rsvps")
      .select("plus_ones")
      .eq("game_id", game.id);

    assert(!rsvpError, `rsvps query failed for ${game.id}: ${rsvpError?.message ?? "unknown"}`);

    const actual = sumHeadcount(rsvps ?? []);

    const { data: pushRows, error: pushError } = await supabase
      .from("game_push_state")
      .select("cycle_at, rsvp_headcount, game_status, next_live_at")
      .eq("game_id", game.id)
      .order("cycle_at", { ascending: false });

    assert(!pushError, `game_push_state query failed for ${game.id}: ${pushError?.message ?? "unknown"}`);

    const current = (pushRows ?? []).find(
      (row) => new Date(row.cycle_at).getTime() === new Date(game.rsvp_cycle_at).getTime(),
    );

    if (!current) {
      missingCurrentRow += 1;
      console.warn(`WARN ${game.id} (${game.name}): no push_state row for current cycle`);
      continue;
    }

    checked += 1;

    if (current.rsvp_headcount !== actual) {
      mismatches += 1;
      console.error(
        `FAIL ${game.id} (${game.name}): push_headcount=${current.rsvp_headcount} actual=${actual}`,
      );
    } else {
      console.log(`OK   ${game.id} (${game.name}): headcount=${actual}`);
    }

    if (game.status === "cancelled") {
      assert(current.next_live_at === null, `${game.id}: cancelled game should have next_live_at NULL`);
    }
  }

  assert(missingCurrentRow === 0, `${missingCurrentRow} game(s) missing current-cycle push_state row`);
  assert(mismatches === 0, `${mismatches} game(s) with headcount mismatch`);

  console.log(`\nAll ${checked} push-state headcount check(s) passed.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
