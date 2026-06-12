/**
 * Verify migration 048 — one game per weekday per group, max 7 games per group.
 *
 * Usage: npm run verify:group-game-limits
 *
 * Requires .env.local with VITE_SUPABASE_URL (or SUPABASE_URL) and
 * SUPABASE_SERVICE_ROLE_KEY. Creates an isolated test group, exercises
 * admin_upsert_game, then cleans up.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = Date.now().toString(36);
const groupId = `verify-048-${runId}`;
const adminSecret = "verify048";
const createdGameIds = [];

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertErrorMessage(error, substring, label) {
  const message = error?.message ?? String(error);
  assert(
    message.toLowerCase().includes(substring.toLowerCase()),
    `${label}: expected error containing "${substring}", got "${message}"`,
  );
}

function toRpcGame({ id, weekday, startTime = "10:00:00" }) {
  return {
    id,
    group_id: groupId,
    name: `Verify game ${weekday}`,
    location: "Test Park",
    address: null,
    weekday,
    start_time: startTime,
    timezone: "America/Los_Angeles",
    type: "goaltimate",
    target: 8,
    status: "open",
  };
}

async function upsertGame(payload) {
  return supabase.rpc("admin_upsert_game", {
    p_secret: adminSecret,
    p_game: payload,
  });
}

async function setupGroup() {
  const { error } = await supabase.from("groups").insert({
    id: groupId,
    name: "Verify 048 limits",
    description: "Temporary group for verify-group-game-limits.mjs",
    admin_passcode: adminSecret,
  });
  if (error) throw new Error(`setup group: ${error.message}`);
}

async function cleanup() {
  if (createdGameIds.length > 0) {
    const { error: gamesError } = await supabase.from("games").delete().in("id", createdGameIds);
    if (gamesError) console.warn("cleanup games:", gamesError.message);
  }

  const { error: groupError } = await supabase.from("groups").delete().eq("id", groupId);
  if (groupError) console.warn("cleanup group:", groupError.message);
}

async function assertNoDuplicateWeekdaysInDb() {
  const { data, error } = await supabase.from("games").select("group_id, weekday");
  if (error) throw new Error(`games scan: ${error.message}`);

  const counts = new Map();
  for (const row of data ?? []) {
    const key = `${row.group_id}:${row.weekday}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
  assert(
    duplicates.length === 0,
    `found duplicate (group_id, weekday) rows: ${duplicates.map(([key]) => key).join(", ")}`,
  );
}

async function createGame(weekday, startTime) {
  const id = `verify-048-g-${runId}-w${weekday}`;
  const { error } = await upsertGame(toRpcGame({ id, weekday, startTime }));
  if (error) throw new Error(`create weekday ${weekday}: ${error.message}`);
  createdGameIds.push(id);
  return id;
}

async function main() {
  console.log("verify:group-game-limits — starting");
  await setupGroup();

  try {
    await assertNoDuplicateWeekdaysInDb();
    console.log("  ok  no duplicate (group_id, weekday) in database");

    const firstId = await createGame(0);
    console.log("  ok  created first game on weekday 0");

    const dup = await upsertGame(toRpcGame({ id: `verify-048-g-${runId}-dup`, weekday: 0 }));
    assert(dup.error, "duplicate weekday insert should fail");
    assertErrorMessage(dup.error, "game on this weekday", "duplicate weekday");
    console.log("  ok  rejected second game on same weekday");

    for (let weekday = 1; weekday <= 6; weekday += 1) {
      await createGame(weekday, `${10 + weekday}:00:00`);
    }
    console.log("  ok  created games for weekdays 1–6 (7 total)");

    const { count, error: countError } = await supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId);
    assert(!countError, `count games: ${countError?.message}`);
    assert(count === 7, `expected 7 games in test group, got ${count}`);

    const eighth = await upsertGame(
      toRpcGame({ id: `verify-048-g-${runId}-eighth`, weekday: 0, startTime: "20:00:00" }),
    );
    assert(eighth.error, "eighth game insert should fail when group is full");
    const eighthMsg = eighth.error.message.toLowerCase();
    assert(
      eighthMsg.includes("game on this weekday") || eighthMsg.includes("maximum of 7 games"),
      `8th game: expected weekday or capacity error, got "${eighth.error.message}"`,
    );
    console.log("  ok  rejected 8th game when all weekdays are taken");

    const { error: directDupError } = await supabase.from("games").insert({
      id: `verify-048-g-${runId}-direct-dup`,
      group_id: groupId,
      name: "Direct dup",
      location: "Test Park",
      weekday: 0,
      start_time: "11:00:00",
      timezone: "America/Los_Angeles",
      type: "goaltimate",
      target: 8,
      status: "open",
    });
    assert(directDupError, "direct insert duplicate weekday should fail");
    assert(
      directDupError.code === "23505" || directDupError.message.includes("games_group_weekday_unique"),
      `unique constraint: expected 23505, got ${directDupError.code} ${directDupError.message}`,
    );
    console.log("  ok  games_group_weekday_unique constraint enforced on direct insert");

    const moveOntoTaken = await upsertGame(
      toRpcGame({ id: firstId, weekday: 1, startTime: "10:00:00" }),
    );
    assert(moveOntoTaken.error, "moving onto taken weekday should fail");
    assertErrorMessage(moveOntoTaken.error, "game on this weekday", "edit weekday conflict");
    console.log("  ok  rejected edit that collides with another game's weekday");

    const keepDay = await upsertGame(
      toRpcGame({ id: firstId, weekday: 0, startTime: "10:30:00" }),
    );
    assert(!keepDay.error, `edit same weekday should succeed: ${keepDay.error?.message}`);
    console.log("  ok  allowed edit keeping the same weekday");

    console.log("verify:group-game-limits — all checks passed");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("verify:group-game-limits — FAILED");
  console.error(error.message);
  cleanup().finally(() => process.exit(1));
});
