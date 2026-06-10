/**
 * Phase 3c — pregame rsvp_surge_* + live checkin_live_* enqueue (catch-up + coalesce).
 *
 * Usage: npm run verify:3c-checkin-badge
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:3c-checkin-badge
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

async function pendingRsvpBadge(gameIdFilter) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, event_type")
    .eq("game_id", gameIdFilter)
    .is("processed_at", null)
    .in("event_type", ["rsvp_surge_some", "rsvp_surge_full"]);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function pendingCheckinBadge(gameIdFilter) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, event_type")
    .eq("game_id", gameIdFilter)
    .is("processed_at", null)
    .in("event_type", ["checkin_live_some", "checkin_live_full"]);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function testPregameRsvpSurge(game) {
  const savedCycle = game.rsvp_cycle_at;
  const futureCycle = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: savedState, error: stateError } = await supabase
    .from("game_push_state")
    .select(
      "rsvp_headcount, pregame_guest_count, last_badge_milestone, last_phase, next_live_at",
    )
    .eq("game_id", gameId)
    .eq("cycle_at", savedCycle)
    .maybeSingle();
  if (stateError) throw new Error(stateError.message);

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  const { error: cycleError } = await supabase
    .from("games")
    .update({ rsvp_cycle_at: futureCycle })
    .eq("id", gameId);
  if (cycleError) throw new Error(cycleError.message);

  const surgeFullThreshold = Math.ceil(game.target * 2);

  const { error: upsertError } = await supabase.from("game_push_state").upsert(
    {
      game_id: gameId,
      cycle_at: futureCycle,
      group_id: game.group_id,
      target: game.target,
      game_status: "open",
      rsvp_headcount: surgeFullThreshold,
      pregame_guest_count: 0,
      last_badge_milestone: "go",
      last_phase: null,
      next_live_at: futureCycle,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "game_id,cycle_at" },
  );
  if (upsertError) throw new Error(upsertError.message);

  const { data: caughtUp, error: rpcError } = await supabase.rpc(
    "try_enqueue_rsvp_badge_upgrade",
    { p_game_id: gameId, p_cycle: futureCycle },
  );
  if (rpcError) throw new Error(`try_enqueue_rsvp_badge_upgrade: ${rpcError.message}`);
  assert(caughtUp === true, "expected pregame catch-up enqueue at rsvp_surge_full");

  let pending = await pendingRsvpBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "rsvp_surge_full"),
    "expected pending rsvp_surge_full",
  );

  const { data: dup, error: dupError } = await supabase.rpc("try_enqueue_rsvp_badge_upgrade", {
    p_game_id: gameId,
    p_cycle: futureCycle,
  });
  if (dupError) throw new Error(dupError.message);
  assert(dup === false, "expected no duplicate rsvp_surge_full enqueue");

  const { error: someStateError } = await supabase
    .from("game_push_state")
    .update({
      rsvp_headcount: Math.ceil(game.target * 1.5),
      last_badge_milestone: "go",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", futureCycle);
  if (someStateError) throw new Error(someStateError.message);

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  const { data: someUp, error: someRpcError } = await supabase.rpc(
    "try_enqueue_rsvp_badge_upgrade",
    { p_game_id: gameId, p_cycle: futureCycle },
  );
  if (someRpcError) throw new Error(someRpcError.message);
  assert(someUp === true, "expected rsvp_surge_some enqueue");

  pending = await pendingRsvpBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "rsvp_surge_some"),
    "expected pending rsvp_surge_some",
  );

  const { error: coalesceStateError } = await supabase
    .from("game_push_state")
    .update({
      rsvp_headcount: surgeFullThreshold,
      last_badge_milestone: "live_some",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", futureCycle);
  if (coalesceStateError) throw new Error(coalesceStateError.message);

  const { data: fullUp, error: fullRpcError } = await supabase.rpc(
    "try_enqueue_rsvp_badge_upgrade",
    { p_game_id: gameId, p_cycle: futureCycle },
  );
  if (fullRpcError) throw new Error(fullRpcError.message);
  assert(fullUp === true, "expected rsvp_surge_full upgrade from rsvp_surge_some");

  pending = await pendingRsvpBadge(gameId);
  assert(!pending.some((row) => row.event_type === "rsvp_surge_some"), "rsvp_surge_some should be superseded");
  assert(
    pending.some((row) => row.event_type === "rsvp_surge_full"),
    "expected only rsvp_surge_full pending",
  );

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  if (savedCycle) {
    await supabase.from("games").update({ rsvp_cycle_at: savedCycle }).eq("id", gameId);
    if (savedState) {
      await supabase
        .from("game_push_state")
        .update({
          rsvp_headcount: savedState.rsvp_headcount ?? 0,
          pregame_guest_count: savedState.pregame_guest_count ?? 0,
          last_badge_milestone: savedState.last_badge_milestone,
          last_phase: savedState.last_phase,
          next_live_at: savedState.next_live_at,
          updated_at: new Date().toISOString(),
        })
        .eq("game_id", gameId)
        .eq("cycle_at", savedCycle);
    }
  }

  await supabase.from("game_push_state").delete().eq("game_id", gameId).eq("cycle_at", futureCycle);

  console.log(`OK — pregame rsvp surge milestones (${gameId}, target=${game.target})`);
}

async function testLiveCheckinBadge(game) {
  const savedCycle = game.rsvp_cycle_at;
  const liveCycle = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: savedState, error: stateError } = await supabase
    .from("game_push_state")
    .select("checkin_headcount, last_checkin_badge_milestone, last_phase, next_live_at")
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
      checkin_headcount: liveFullThreshold,
      last_checkin_badge_milestone: "go",
      last_phase: "live",
      next_live_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "game_id,cycle_at" },
  );
  if (upsertError) throw new Error(upsertError.message);

  const { data: caughtUp, error: rpcError } = await supabase.rpc(
    "try_enqueue_checkin_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (rpcError) throw new Error(`try_enqueue_checkin_badge_upgrade: ${rpcError.message}`);
  assert(caughtUp === true, "expected live catch-up enqueue at checkin_live_full");

  let pending = await pendingCheckinBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "checkin_live_full"),
    "expected pending checkin_live_full",
  );

  const { data: dup, error: dupError } = await supabase.rpc("try_enqueue_checkin_badge_upgrade", {
    p_game_id: gameId,
    p_cycle: liveCycle,
  });
  if (dupError) throw new Error(dupError.message);
  assert(dup === false, "expected no duplicate checkin_live_full enqueue");

  const { error: someStateError } = await supabase
    .from("game_push_state")
    .update({
      checkin_headcount: Math.ceil(game.target * 1.5),
      last_checkin_badge_milestone: "go",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", liveCycle);
  if (someStateError) throw new Error(someStateError.message);

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  const { data: someUp, error: someRpcError } = await supabase.rpc(
    "try_enqueue_checkin_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (someRpcError) throw new Error(someRpcError.message);
  assert(someUp === true, "expected checkin_live_some enqueue");

  pending = await pendingCheckinBadge(gameId);
  assert(
    pending.some((row) => row.event_type === "checkin_live_some"),
    "expected pending checkin_live_some",
  );

  const { error: coalesceStateError } = await supabase
    .from("game_push_state")
    .update({
      checkin_headcount: liveFullThreshold,
      last_checkin_badge_milestone: "live_some",
      updated_at: new Date().toISOString(),
    })
    .eq("game_id", gameId)
    .eq("cycle_at", liveCycle);
  if (coalesceStateError) throw new Error(coalesceStateError.message);

  const { data: fullUp, error: fullRpcError } = await supabase.rpc(
    "try_enqueue_checkin_badge_upgrade",
    { p_game_id: gameId, p_cycle: liveCycle },
  );
  if (fullRpcError) throw new Error(fullRpcError.message);
  assert(fullUp === true, "expected checkin_live_full upgrade from checkin_live_some");

  pending = await pendingCheckinBadge(gameId);
  assert(
    !pending.some((row) => row.event_type === "checkin_live_some"),
    "checkin_live_some should be superseded",
  );
  assert(
    pending.some((row) => row.event_type === "checkin_live_full"),
    "expected only checkin_live_full pending",
  );

  await supabase.from("push_outbox").delete().eq("game_id", gameId).is("processed_at", null);

  if (savedCycle) {
    await supabase.from("games").update({ rsvp_cycle_at: savedCycle }).eq("id", gameId);
    if (savedState) {
      await supabase
        .from("game_push_state")
        .update({
          checkin_headcount: savedState.checkin_headcount ?? 0,
          last_checkin_badge_milestone: savedState.last_checkin_badge_milestone,
          last_phase: savedState.last_phase,
          next_live_at: savedState.next_live_at,
          updated_at: new Date().toISOString(),
        })
        .eq("game_id", gameId)
        .eq("cycle_at", savedCycle);
    }
  }

  await supabase.from("game_push_state").delete().eq("game_id", gameId).eq("cycle_at", liveCycle);

  console.log(`OK — live check-in milestones for ${game.name} (${gameId}, target=${game.target})`);
}

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, target, status, rsvp_cycle_at, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game?.status === "open", `${gameId} must be open`);

  await testPregameRsvpSurge(game);
  await testLiveCheckinBadge(game);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
