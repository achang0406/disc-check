import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { OutboxRow } from "./pushMaterialize.ts";

export const BADGE_EVENT_TYPES = new Set([
  "badge_almost",
  "badge_go",
  "badge_live_some",
  "badge_live_full",
]);

export const BADGE_EVENT_RANK: Record<string, number> = {
  badge_almost: 1,
  badge_go: 2,
  badge_live_some: 3,
  badge_live_full: 4,
};

const MILESTONE_RANK: Record<string, number> = {
  not: 0,
  almost: 1,
  go: 2,
  live_some: 3,
  live_full: 4,
};

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function isBadgeEventType(eventType: string) {
  return BADGE_EVENT_TYPES.has(eventType);
}

export function badgeEventRank(eventType: string) {
  return BADGE_EVENT_RANK[eventType] ?? 0;
}

export function milestoneRank(milestone: string | null | undefined) {
  if (!milestone) return 0;
  return MILESTONE_RANK[milestone] ?? 0;
}

export function eventTypeToMilestone(eventType: string) {
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

export function isPregameWindow(cycleAt: Date, now = new Date()) {
  return now.getTime() < cycleAt.getTime();
}

export function isLiveWindow(cycleAt: Date, now = new Date()) {
  const start = cycleAt.getTime();
  const end = start + LIVE_WINDOW_MS;
  const nowMs = now.getTime();
  return nowMs >= start && nowMs < end;
}

export function computePregameBadgeMilestone(headcount: number, target: number) {
  if (headcount >= target) return "go";
  if (headcount >= Math.max(1, target - 2)) return "almost";
  return "not";
}

export function computeLiveBadgeMilestone(headcount: number, target: number) {
  const liveFull = Math.ceil(target * 2);
  const liveSome = Math.ceil(target * 1.5);

  if (headcount >= liveFull) return "live_full";
  if (headcount >= liveSome) return "live_some";
  if (headcount >= target) return "go";
  if (headcount >= Math.max(1, target - 2)) return "almost";
  return "not";
}

export function computeCurrentBadgeMilestone(
  headcount: number,
  target: number,
  cycleAt: Date,
  now = new Date(),
) {
  if (isPregameWindow(cycleAt, now)) {
    return computePregameBadgeMilestone(headcount, target);
  }

  if (isLiveWindow(cycleAt, now)) {
    return computeLiveBadgeMilestone(headcount, target);
  }

  return "not";
}

export function isBadgeEventValidForPhase(eventType: string, cycleAt: Date, now = new Date()) {
  if (eventType === "badge_almost" || eventType === "badge_go") {
    return isPregameWindow(cycleAt, now);
  }

  if (eventType === "badge_live_some" || eventType === "badge_live_full") {
    return isLiveWindow(cycleAt, now);
  }

  return false;
}

export function isStaleBadgeRowForMilestone(
  eventType: string,
  headcount: number,
  target: number,
  cycleAt: Date,
  now = new Date(),
) {
  if (!isBadgeEventType(eventType)) {
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

export function winningBadgeRowIds(rows: OutboxRow[]) {
  const winners = new Map<string, number>();

  for (const row of rows) {
    if (!row.game_id || !isBadgeEventType(row.event_type)) continue;

    const rank = badgeEventRank(row.event_type);
    const current = winners.get(row.game_id);

    if (current === undefined) {
      winners.set(row.game_id, row.id);
      continue;
    }

    const currentRow = rows.find((item) => item.id === current);
    if (!currentRow || rank > badgeEventRank(currentRow.event_type)) {
      winners.set(row.game_id, row.id);
    }
  }

  return new Set(winners.values());
}

export async function isStaleBadgeOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (!row.game_id || !isBadgeEventType(row.event_type)) {
    return false;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("rsvp_cycle_at, status")
    .eq("id", row.game_id)
    .maybeSingle();

  if (gameError) {
    console.error("Badge stale check failed — games", row.id, gameError.message);
    return true;
  }

  if (!game?.rsvp_cycle_at || game.status === "cancelled") {
    return true;
  }

  const cycleAt = new Date(game.rsvp_cycle_at);

  const { data: state, error: stateError } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount, target")
    .eq("game_id", row.game_id)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();

  if (stateError) {
    console.error("Badge stale check failed — game_push_state", row.id, stateError.message);
    return true;
  }

  if (!state) {
    return true;
  }

  return isStaleBadgeRowForMilestone(
    row.event_type,
    state.rsvp_headcount ?? 0,
    state.target ?? 0,
    cycleAt,
  );
}
