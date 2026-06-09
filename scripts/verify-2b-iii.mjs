/**
 * Phase 2b-iii — integration validation (staging / remote Supabase).
 *
 * Runs:
 *   1. 2b-ii headcount sync (dependency)
 *   2. Badge outbox stale check
 *   3. Live trigger tests on VERIFY_GAME_ID (default: Saturday Goalti)
 *   4. Optional drain + outbox re-check
 *
 * Usage: npm run verify:2b-iii
 * Optional: VERIFY_GAME_ID=g1 SKIP_DRAIN=1 npm run verify:2b-iii
 */
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameId = process.env.VERIFY_GAME_ID?.trim() || "g_1baf4461";
const skipDrain = process.env.SKIP_DRAIN === "1";

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNpmScript(script) {
  console.log(`\n==> ${script}`);
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    env: { ...process.env, VERIFY_GAME_ID: gameId },
  });
  assert(result.status === 0, `${script} failed (exit ${result.status})`);
}

async function drainOutbox() {
  console.log("\n==> drain process-push-outbox");
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
}

async function fetchGame() {
  const { data, error } = await supabase
    .from("games")
    .select("id, name, target, status, rsvp_cycle_at, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (error) throw new Error(`games query failed: ${error.message}`);
  assert(data, `game not found: ${gameId}`);
  assert(data.status === "open", `${data.name} is not open (${data.status})`);
  assert(data.rsvp_cycle_at, `${data.name} has no rsvp_cycle_at`);
  assert(new Date() < new Date(data.rsvp_cycle_at), `${data.name} is not pregame`);
  return data;
}

async function clearRsvps(cycleAt) {
  const { error } = await supabase.from("rsvps").delete().eq("game_id", gameId);
  if (error) throw new Error(`clear rsvps failed: ${error.message}`);

  if (cycleAt) {
    const { error: stateError } = await supabase
      .from("game_push_state")
      .update({ last_badge_milestone: null, updated_at: new Date().toISOString() })
      .eq("game_id", gameId)
      .eq("cycle_at", cycleAt);
    if (stateError) throw new Error(`reset last_badge_milestone failed: ${stateError.message}`);
  }

  const { error: outboxError } = await supabase
    .from("push_outbox")
    .delete()
    .eq("game_id", gameId)
    .is("processed_at", null)
    .in("event_type", ["badge_almost", "badge_go"]);
  if (outboxError) throw new Error(`clear pending badge outbox failed: ${outboxError.message}`);
}

async function headcount() {
  const { data, error } = await supabase
    .from("rsvps")
    .select("plus_ones")
    .eq("game_id", gameId);
  if (error) throw new Error(`rsvps query failed: ${error.message}`);
  return (data ?? []).reduce((total, row) => total + 1 + (row.plus_ones ?? 0), 0);
}

async function pushState(cycleAt) {
  const { data, error } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount, last_badge_milestone")
    .eq("game_id", gameId)
    .eq("cycle_at", cycleAt)
    .maybeSingle();
  if (error) throw new Error(`game_push_state query failed: ${error.message}`);
  return data;
}

async function pendingBadgeRows() {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, event_type, payload, processed_at")
    .eq("game_id", gameId)
    .is("processed_at", null)
    .in("event_type", ["badge_almost", "badge_go"]);
  if (error) throw new Error(`push_outbox query failed: ${error.message}`);
  return data ?? [];
}

async function insertRsvp(suffix, plusOnes) {
  const userId = `verify_2b3_${suffix}_${Date.now()}`;
  const { error } = await supabase.from("rsvps").insert({
    game_id: gameId,
    user_id: userId,
    name: `Verify ${suffix}`,
    plus_ones: plusOnes,
    bringing_kit: false,
  });
  if (error) throw new Error(`RSVP insert (${suffix}, +${plusOnes}) failed: ${error.message}`);
  return userId;
}

async function runTriggerTests(game) {
  console.log(`\n==> trigger tests on ${game.name} (${game.id}, target=${game.target})`);

  await clearRsvps(game.rsvp_cycle_at);
  let state = await pushState(game.rsvp_cycle_at);
  assert((state?.rsvp_headcount ?? 0) === 0, `expected headcount 0 after clear, got ${state?.rsvp_headcount}`);

  // 038: RSVP at go threshold must succeed (was: enqueue overload error)
  console.log("\n--- test: solo RSVP at go threshold (038)");
  await insertRsvp("go_solo", game.target - 1);
  assert((await headcount()) === game.target, `expected headcount ${game.target}`);
  state = await pushState(game.rsvp_cycle_at);
  assert(state?.last_badge_milestone === "go", `expected last_badge_milestone go, got ${state?.last_badge_milestone}`);
  let pending = await pendingBadgeRows();
  assert(pending.some((row) => row.event_type === "badge_go"), "expected pending badge_go row");
  await clearRsvps(game.rsvp_cycle_at);

  // almost enqueue + payload snapshot
  console.log("\n--- test: almost milestone + payload snapshot");
  const almostNeed = Math.max(1, game.target - 2);
  const plusForAlmost = almostNeed - 1;
  await insertRsvp("almost", plusForAlmost);
  assert((await headcount()) === almostNeed, `expected headcount ${almostNeed}`);
  state = await pushState(game.rsvp_cycle_at);
  assert(state?.last_badge_milestone === "almost", `expected almost, got ${state?.last_badge_milestone}`);
  pending = await pendingBadgeRows();
  const almostRow = pending.find((row) => row.event_type === "badge_almost");
  assert(almostRow, "expected pending badge_almost");
  assert(almostRow.payload?.headcount_at_enqueue === almostNeed, "badge_almost missing headcount_at_enqueue");
  assert(almostRow.payload?.target_at_enqueue === game.target, "badge_almost missing target_at_enqueue");

  // coalesce: crossing go supersedes pending almost
  console.log("\n--- test: coalesce almost → go (supersede)");
  const headcountDelta = game.target - almostNeed;
  await insertRsvp("to_go", headcountDelta - 1);
  assert((await headcount()) === game.target, `expected headcount ${game.target}`);
  state = await pushState(game.rsvp_cycle_at);
  assert(state?.last_badge_milestone === "go", `expected go, got ${state?.last_badge_milestone}`);
  pending = await pendingBadgeRows();
  assert(!pending.some((row) => row.event_type === "badge_almost"), "badge_almost should be superseded");
  assert(pending.some((row) => row.event_type === "badge_go"), "expected pending badge_go after coalesce");

  // same-tier RSVP should not add another badge row
  console.log("\n--- test: no duplicate enqueue at same tier");
  const beforeIds = new Set((await pendingBadgeRows()).map((row) => row.id));
  await insertRsvp("same_tier", 0);
  assert((await headcount()) === game.target + 1, "headcount should increment");
  pending = await pendingBadgeRows();
  const newRows = pending.filter((row) => !beforeIds.has(row.id));
  assert(newRows.length === 0, `expected no new badge rows at same tier, got ${newRows.map((r) => r.event_type)}`);

  await clearRsvps(game.rsvp_cycle_at);
  console.log("\nOK — trigger integration tests passed");
}

async function main() {
  runNpmScript("verify:2b-ii-push-state");
  runNpmScript("verify:2b-iii-badge-outbox");

  const game = await fetchGame();
  await runTriggerTests(game);

  if (!skipDrain) {
    await drainOutbox();
    runNpmScript("verify:2b-iii-badge-outbox");
  } else {
    console.log("\n(skip drain — SKIP_DRAIN=1; run verify:2b-iii-badge-outbox after manual drain)");
  }

  console.log("\nAll 2b-iii validation checks passed.");
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
