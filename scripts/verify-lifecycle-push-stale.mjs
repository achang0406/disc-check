/**
 * Lifecycle push stale checks — game_cancelled reopen + phase_live reset race.
 *
 * Inserts synthetic pending outbox rows, drains process-push-outbox, asserts rows
 * are skipped (processed_at set, no longer pending).
 *
 * Usage: npm run verify:lifecycle-push-stale
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:lifecycle-push-stale
 *
 * Requires deployed process-push-outbox with lifecycle stale guards.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameId = process.env.VERIFY_GAME_ID?.trim() || "g_1baf4461";

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function drainOutbox() {
  const response = await fetch(`${url}/functions/v1/process-push-outbox`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await response.json();
  console.log("drain response:", JSON.stringify(body));
  assert(response.ok, `drain failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function insertOutboxRow(groupId, eventType) {
  const { data, error } = await supabase
    .from("push_outbox")
    .insert({
      group_id: groupId,
      game_id: gameId,
      event_type: eventType,
      payload: null,
      exclude_subscriber_ids: [],
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert ${eventType} outbox row: ${error.message}`);
  return data.id;
}

async function assertRowProcessed(rowId, label) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, processed_at")
    .eq("id", rowId)
    .maybeSingle();
  if (error) throw new Error(`${label} outbox read: ${error.message}`);
  assert(data?.processed_at, `${label} row ${rowId} should be processed after drain`);
}

async function testStaleGameCancelled(game) {
  assert(game.status === "open", `${gameId} must be open for cancel-reopen stale test`);

  const rowId = await insertOutboxRow(game.group_id, "game_cancelled");
  const drain = await drainOutbox();
  assert(drain.skipped >= 1, "expected at least one skipped row for stale game_cancelled");
  await assertRowProcessed(rowId, "game_cancelled");
  console.log("OK — stale game_cancelled skipped when game is open");
}

async function testStalePhaseLive(game) {
  const { data: before, error: beforeError } = await supabase
    .from("game_push_state")
    .select("last_phase, next_live_at")
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();
  if (beforeError) throw new Error(beforeError.message);
  assert(before, `missing game_push_state for ${gameId}`);

  const savedLastPhase = before.last_phase;
  const savedNextLive = before.next_live_at;

  const { error: primeError } = await supabase
    .from("game_push_state")
    .update({
      last_phase: null,
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at);
  if (primeError) throw new Error(primeError.message);

  const rowId = await insertOutboxRow(game.group_id, "phase_live");

  try {
    const drain = await drainOutbox();
    assert(drain.skipped >= 1, "expected at least one skipped row for stale phase_live");
    await assertRowProcessed(rowId, "phase_live");
    console.log("OK — stale phase_live skipped when last_phase is cleared");
  } finally {
    const { error: restoreError } = await supabase
      .from("game_push_state")
      .update({
        last_phase: savedLastPhase,
        next_live_at: savedNextLive,
        updated_at: new Date().toISOString(),
      })
      .eq("game_id", gameId)
      .eq("cycle_at", game.rsvp_cycle_at);
    if (restoreError) throw new Error(restoreError.message);
  }
}

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, status, rsvp_cycle_at, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game, `game not found: ${gameId}`);
  assert(game.rsvp_cycle_at, `${gameId} missing rsvp_cycle_at`);

  console.log(`Testing lifecycle stale skips on ${game.name} (${gameId})`);

  await testStaleGameCancelled(game);
  await testStalePhaseLive(game);

  console.log("OK — lifecycle push stale checks");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
