/**
 * Phase 2b-iii — read-only checks: unprocessed badge outbox rows + stale tier detection.
 *
 * Usage: npm run verify:2b-iii-badge-outbox
 * Optional: VERIFY_GAME_ID=g1 npm run verify:2b-iii-badge-outbox
 *
 * Run after at least one process-push-outbox drain tick. Exit 1 with stale rows means
 * the drain has not cleared them yet (invoke drain, wait ~2 min, re-run) — not always a bug.
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameIdFilter = process.env.VERIFY_GAME_ID?.trim() || null;

const BADGE_EVENT_TYPES = new Set([
  "badge_almost",
  "badge_go",
  "badge_live_some",
  "badge_live_full",
]);

const MILESTONE_RANK = {
  not: 0,
  almost: 1,
  go: 2,
  live_some: 3,
  live_full: 4,
};

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function milestoneRank(value) {
  return MILESTONE_RANK[value] ?? 0;
}

function eventTypeToMilestone(eventType) {
  switch (eventType) {
    case "badge_almost":
      return "almost";
    case "badge_go":
      return "go";
    case "badge_live_some":
      return "live_some";
    case "badge_live_full":
      return "live_full";
    default:
      return "not";
  }
}

function isPregameWindow(cycleAt, now = new Date()) {
  return now.getTime() < cycleAt.getTime();
}

function isLiveWindow(cycleAt, now = new Date()) {
  const start = cycleAt.getTime();
  const end = start + LIVE_WINDOW_MS;
  const nowMs = now.getTime();
  return nowMs >= start && nowMs < end;
}

function computePregameBadgeMilestone(headcount, target) {
  if (headcount >= target) return "go";
  if (headcount >= Math.max(1, target - 2)) return "almost";
  return "not";
}

function computeLiveBadgeMilestone(headcount, target) {
  const liveFull = Math.ceil(target * 2);
  const liveSome = Math.ceil(target * 1.5);

  if (headcount >= liveFull) return "live_full";
  if (headcount >= liveSome) return "live_some";
  if (headcount >= target) return "go";
  if (headcount >= Math.max(1, target - 2)) return "almost";
  return "not";
}

function computeCurrentBadgeMilestone(headcount, target, cycleAt, now = new Date()) {
  if (isPregameWindow(cycleAt, now)) {
    return computePregameBadgeMilestone(headcount, target);
  }

  if (isLiveWindow(cycleAt, now)) {
    return computeLiveBadgeMilestone(headcount, target);
  }

  return "not";
}

function isBadgeEventValidForPhase(eventType, cycleAt, now = new Date()) {
  if (eventType === "badge_almost" || eventType === "badge_go") {
    return isPregameWindow(cycleAt, now);
  }

  if (eventType === "badge_live_some" || eventType === "badge_live_full") {
    return isLiveWindow(cycleAt, now);
  }

  return false;
}

function isStaleBadgeRowForMilestone(eventType, headcount, target, cycleAt, now = new Date()) {
  if (!BADGE_EVENT_TYPES.has(eventType)) {
    return false;
  }

  if (!isPregameWindow(cycleAt, now) && !isLiveWindow(cycleAt, now)) {
    return true;
  }

  if (!isBadgeEventValidForPhase(eventType, cycleAt, now)) {
    return true;
  }

  const currentMilestone = computeCurrentBadgeMilestone(headcount, target, cycleAt, now);
  const rowMilestone = eventTypeToMilestone(eventType);

  return milestoneRank(rowMilestone) !== milestoneRank(currentMilestone);
}

async function main() {
  let query = supabase
    .from("push_outbox")
    .select("id, group_id, game_id, event_type, payload, created_at")
    .is("processed_at", null)
    .in("event_type", [...BADGE_EVENT_TYPES])
    .order("created_at", { ascending: true });

  if (gameIdFilter) {
    query = query.eq("game_id", gameIdFilter);
  }

  const { data: rows, error } = await query;
  assert(!error, `push_outbox query failed: ${error?.message ?? "unknown"}`);

  const pending = rows ?? [];

  if (pending.length === 0) {
    console.log("OK — no unprocessed badge outbox rows");
    process.exit(0);
  }

  let stale = 0;
  let retrying = 0;

  for (const row of pending) {
    const attempts = row.payload?.attempts ?? 0;
    let status = "pending";

    if (row.game_id) {
      const { data: game, error: gameError } = await supabase
        .from("games")
        .select("rsvp_cycle_at, status")
        .eq("id", row.game_id)
        .maybeSingle();

      assert(!gameError, `games query failed for ${row.game_id}: ${gameError?.message ?? "unknown"}`);

      if (!game?.rsvp_cycle_at || game.status === "cancelled") {
        status = "stale";
        stale += 1;
      } else {
        const cycleAt = new Date(game.rsvp_cycle_at);

        const { data: state, error: stateError } = await supabase
          .from("game_push_state")
          .select("rsvp_headcount, target")
          .eq("game_id", row.game_id)
          .eq("cycle_at", game.rsvp_cycle_at)
          .maybeSingle();

        assert(
          !stateError,
          `game_push_state query failed for ${row.game_id}: ${stateError?.message ?? "unknown"}`,
        );

        if (
          !state ||
          isStaleBadgeRowForMilestone(
            row.event_type,
            state.rsvp_headcount ?? 0,
            state.target ?? 0,
            cycleAt,
          )
        ) {
          status = "stale";
          stale += 1;
        }
      }
    }

    if (status === "pending" && attempts > 0) {
      retrying += 1;
      status = `retrying (${attempts})`;
    }

    console.log(
      `${status === "stale" ? "STALE" : "ROW"} id=${row.id} game=${row.game_id ?? "—"} event=${row.event_type} created=${row.created_at} status=${status}`,
    );
  }

  console.log(
    `Summary: ${pending.length} unprocessed badge row(s); ${stale} stale; ${retrying} retrying`,
  );

  if (stale > 0) {
    console.error("Stale rows should be skipped on the next drain tick.");
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
