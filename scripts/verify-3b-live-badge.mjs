/**
 * Phase 3b — live badge milestone enqueue (catch-up + coalesce).
 *
 * Usage: npm run verify:3b-live-badge
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:3b-live-badge
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

async function pendingLiveBadge(gameIdFilter) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, event_type")
    .eq("game_id", gameIdFilter)
    .is("processed_at", null)
    .in("event_type", ["badge_live_some", "badge_live_full"]);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, target, status, rsvp_cycle_at, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game?.status === "open", `${gameId} must be open`);

  const savedCycle = game.rsvp_cycle_at;
  const liveCycle = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: savedState, error: stateError } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount, last_badge_milestone, last_phase, next_live_at")
    .eq("game_id", gameId)
    .eq("cycle_at", savedCycle)
    .maybeSingle();
  if (stateError) throw new Error(stateError.message);

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  const { error: cycleError } = await supabase
    .from("games")
    .update({ rsvp_cycle_at: liveCycle })
    .eq("id", gameId);
  if (cycleError) throw new Error(cycleError.message);

  const liveFullThreshold = Math.ceil(game.target * 2);

  const { error: upsertError } = await supabase.from("game_push_state").upsert(
    {
      game_id: gameId,
      cycle_at: liveCycle,
      group_id: game.group_id,
      target: game.target,
      game_status: "open",
      rsvp_headcount: liveFullThreshold,
      last_badge_milestone: "go",
      last_phase: "live",
      next_live_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "game_id,cycle_at" },
  );
  if (upsertError) throw new Error(upsertError.message);

  const { data: caughtUp, error: rpcError } = await supabase.rpc(
    "try_enqueue_live_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (rpcError) throw new Error(`try_enqueue_live_badge_upgrade: ${rpcError.message}`);
  assert(caughtUp === true, "expected live catch-up enqueue at live_full");

  let pending = await pendingLiveBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "badge_live_full"),
    "expected pending badge_live_full",
  );

  const { data: dup, error: dupError } = await supabase.rpc("try_enqueue_live_badge_upgrade", {
    p_game_id: gameId,
    p_cycle: liveCycle,
  });
  if (dupError) throw new Error(dupError.message);
  assert(dup === false, "expected no duplicate live_full enqueue");

  const { error: someStateError } = await supabase
    .from("game_push_state")
    .update({
      rsvp_headcount: Math.ceil(game.target * 1.5),
      last_badge_milestone: "go",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", liveCycle);
  if (someStateError) throw new Error(someStateError.message);

  await supabase
    .from("push_outbox")
    .delete()
    .eq("game_id", gameId)
    .is("processed_at", null);

  const { data: someUp, error: someRpcError } = await supabase.rpc(
    "try_enqueue_live_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (someRpcError) throw new Error(someRpcError.message);
  assert(someUp === true, "expected live_some enqueue");

  pending = await pendingLiveBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "badge_live_some"),
    "expected pending badge_live_some",
  );

  const { error: coalesceStateError } = await supabase
    .from("game_push_state")
    .update({
      rsvp_headcount: liveFullThreshold,
      last_badge_milestone: "live_some",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", liveCycle);
  if (coalesceStateError) throw new Error(coalesceStateError.message);

  const { data: fullUp, error: fullRpcError } = await supabase.rpc(
    "try_enqueue_live_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (fullRpcError) throw new Error(fullRpcError.message);
  assert(fullUp === true, "expected live_full upgrade from live_some");

  pending = await pendingLiveBadge(gameId);
  assert(!pending.some((row) => row.event_type === "badge_live_some"), "live_some should be superseded");
  assert(pending.some((row) => row.event_type === "badge_live_full"), "expected only badge_live_full pending");

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  if (savedCycle) {
    await supabase.from("games").update({ rsvp_cycle_at: savedCycle }).eq("id", gameId);
    if (savedState) {
      await supabase
        .from("game_push_state")
        .update({
          rsvp_headcount: savedState.rsvp_headcount ?? 0,
          last_badge_milestone: savedState.last_badge_milestone,
          last_phase: savedState.last_phase,
          next_live_at: savedState.next_live_at,
          updated_at: new Date().toISOString(),
        })
        .eq("game_id", gameId)
        .eq("cycle_at", savedCycle);
    }
  }

  await supabase.from("game_push_state").delete().eq("game_id", gameId).eq("cycle_at", liveCycle);

  console.log(`OK — live badge milestones for ${game.name} (${gameId}, target=${game.target})`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
