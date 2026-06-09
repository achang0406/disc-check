/**
 * Phase 3a — integration validation for due phase_live enqueue.
 *
 * Usage: npm run verify:3a-phase-live
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:3a-phase-live
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

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, status, rsvp_cycle_at, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game?.status === "open", `${gameId} must be open`);
  assert(game.rsvp_cycle_at, `${gameId} missing rsvp_cycle_at`);

  const { data: before, error: beforeError } = await supabase
    .from("game_push_state")
    .select("last_phase, next_live_at")
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();
  if (beforeError) throw new Error(beforeError.message);
  assert(before, `missing game_push_state for ${gameId}`);

  const savedNextLive = before.next_live_at;
  const savedLastPhase = before.last_phase;

  const { error: primeError } = await supabase
    .from("game_push_state")
    .update({
      next_live_at: new Date(Date.now() - 60_000).toISOString(),
      last_phase: null,
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at);
  if (primeError) throw new Error(primeError.message);

  await supabase
    .from("push_outbox")
    .delete()
    .eq("game_id", gameId)
    .eq("event_type", "phase_live")
    .is("processed_at", null);

  const { data: enqueued, error: rpcError } = await supabase.rpc("enqueue_due_phase_live_events");
  if (rpcError) throw new Error(`enqueue_due_phase_live_events: ${rpcError.message}`);
  assert(enqueued === 1, `expected 1 enqueued, got ${enqueued}`);

  const { data: outbox, error: outboxError } = await supabase
    .from("push_outbox")
    .select("id, event_type, processed_at")
    .eq("game_id", gameId)
    .eq("event_type", "phase_live")
    .is("processed_at", null);
  if (outboxError) throw new Error(outboxError.message);
  assert(outbox?.length === 1, "expected one pending phase_live row");

  const { data: after, error: afterError } = await supabase
    .from("game_push_state")
    .select("last_phase, next_live_at")
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();
  if (afterError) throw new Error(afterError.message);
  assert(after?.last_phase === "live", `expected last_phase live, got ${after?.last_phase}`);
  assert(after?.next_live_at, "expected next_live_at scheduled for next cycle");

  const { error: restoreError } = await supabase
    .from("game_push_state")
    .update({
      next_live_at: savedNextLive,
      last_phase: savedLastPhase,
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", game.rsvp_cycle_at);
  if (restoreError) throw new Error(restoreError.message);

  await supabase
    .from("push_outbox")
    .delete()
    .eq("game_id", gameId)
    .eq("event_type", "phase_live")
    .is("processed_at", null);

  const { data: dupEnqueued, error: dupError } = await supabase.rpc("enqueue_due_phase_live_events");
  if (dupError) throw new Error(dupError.message);
  assert(dupEnqueued === 0, `expected no duplicate enqueue, got ${dupEnqueued}`);

  console.log(`OK — phase_live enqueue for ${game.name} (${gameId})`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
