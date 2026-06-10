import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { OutboxRow } from "./pushMaterialize.ts";

export const RSVP_BADGE_EVENT_TYPES = new Set([
  "rsvp_almost",
  "rsvp_go",
  "rsvp_surge_some",
  "rsvp_surge_full",
  // Legacy pregame — drain until outbox clears (one release).
  "badge_almost",
  "badge_go",
]);

export const CHECKIN_BADGE_EVENT_TYPES = new Set([
  "checkin_almost",
  "checkin_go",
  "checkin_live_some",
  "checkin_live_full",
  // Legacy live RSVP tiers — drain until outbox clears (one release).
  "badge_live_some",
  "badge_live_full",
]);

export const RSVP_BADGE_EVENT_RANK: Record<string, number> = {
  rsvp_almost: 1,
  rsvp_go: 2,
  rsvp_surge_some: 3,
  rsvp_surge_full: 4,
  badge_almost: 1,
  badge_go: 2,
};

export const CHECKIN_BADGE_EVENT_RANK: Record<string, number> = {
  checkin_almost: 1,
  checkin_go: 2,
  checkin_live_some: 3,
  checkin_live_full: 4,
  badge_live_some: 3,
  badge_live_full: 4,
};

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

export function isRsvpBadgeEventType(eventType: string) {
  return RSVP_BADGE_EVENT_TYPES.has(eventType);
}

export function isCheckinBadgeEventType(eventType: string) {
  return CHECKIN_BADGE_EVENT_TYPES.has(eventType);
}

export function isBadgeEventType(eventType: string) {
  return isRsvpBadgeEventType(eventType) || isCheckinBadgeEventType(eventType);
}

export function rsvpBadgeEventRank(eventType: string) {
  return RSVP_BADGE_EVENT_RANK[eventType] ?? 0;
}

export function checkinBadgeEventRank(eventType: string) {
  return CHECKIN_BADGE_EVENT_RANK[eventType] ?? 0;
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

/** Shared 4-tier milestone ladder (ranks 0–4). */
export function computeBadgeMilestone(headcount: number, target: number) {
  const tierFull = Math.ceil(target * 2);
  const tierSome = Math.ceil(target * 1.5);

  if (headcount >= tierFull) return 4;
  if (headcount >= tierSome) return 3;
  if (headcount >= target) return 2;
  if (headcount >= Math.max(1, target - 2)) return 1;
  return 0;
}

export function isStaleRsvpRowForMilestone(
  eventType: string,
  headcount: number,
  target: number,
  cycleAt: Date,
  now = new Date(),
) {
  if (!isRsvpBadgeEventType(eventType)) {
    return false;
  }

  if (!isPregameWindow(cycleAt, now)) {
    return true;
  }

  const currentRank = computeBadgeMilestone(headcount, target);
  const rowRank = rsvpBadgeEventRank(eventType);

  return rowRank === 0 || rowRank !== currentRank;
}

export function isStaleCheckinRowForMilestone(
  eventType: string,
  headcount: number,
  target: number,
  cycleAt: Date,
  now = new Date(),
) {
  if (!isCheckinBadgeEventType(eventType)) {
    return false;
  }

  if (!isLiveWindow(cycleAt, now)) {
    return true;
  }

  const currentRank = computeBadgeMilestone(headcount, target);
  const rowRank = checkinBadgeEventRank(eventType);

  return rowRank === 0 || rowRank !== currentRank;
}

function winningBadgeRowIdsForFamily(
  rows: OutboxRow[],
  isFamilyEvent: (eventType: string) => boolean,
  eventRank: (eventType: string) => number,
) {
  const winners = new Map<string, number>();

  for (const row of rows) {
    if (!row.game_id || !isFamilyEvent(row.event_type)) continue;

    const rank = eventRank(row.event_type);
    const current = winners.get(row.game_id);

    if (current === undefined) {
      winners.set(row.game_id, row.id);
      continue;
    }

    const currentRow = rows.find((item) => item.id === current);
    if (!currentRow || rank > eventRank(currentRow.event_type)) {
      winners.set(row.game_id, row.id);
    }
  }

  return new Set(winners.values());
}

export function winningRsvpBadgeRowIds(rows: OutboxRow[]) {
  return winningBadgeRowIdsForFamily(rows, isRsvpBadgeEventType, rsvpBadgeEventRank);
}

export function winningCheckinBadgeRowIds(rows: OutboxRow[]) {
  return winningBadgeRowIdsForFamily(rows, isCheckinBadgeEventType, checkinBadgeEventRank);
}

export async function isStaleRsvpOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (!row.game_id || !isRsvpBadgeEventType(row.event_type)) {
    return false;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("rsvp_cycle_at, status")
    .eq("id", row.game_id)
    .maybeSingle();

  if (gameError) {
    console.error("RSVP badge stale check failed — games", row.id, gameError.message);
    return true;
  }

  if (!game?.rsvp_cycle_at || game.status === "cancelled") {
    return true;
  }

  const cycleAt = new Date(game.rsvp_cycle_at);

  const { data: state, error: stateError } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount, pregame_guest_count, target")
    .eq("game_id", row.game_id)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();

  if (stateError) {
    console.error("RSVP badge stale check failed — game_push_state", row.id, stateError.message);
    return true;
  }

  if (!state) {
    return true;
  }

  const headcount = (state.rsvp_headcount ?? 0) + (state.pregame_guest_count ?? 0);

  return isStaleRsvpRowForMilestone(
    row.event_type,
    headcount,
    state.target ?? 0,
    cycleAt,
  );
}

export async function isStaleCheckinOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (!row.game_id || !isCheckinBadgeEventType(row.event_type)) {
    return false;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("rsvp_cycle_at, status")
    .eq("id", row.game_id)
    .maybeSingle();

  if (gameError) {
    console.error("Check-in badge stale check failed — games", row.id, gameError.message);
    return true;
  }

  if (!game?.rsvp_cycle_at || game.status === "cancelled") {
    return true;
  }

  const cycleAt = new Date(game.rsvp_cycle_at);

  const { data: state, error: stateError } = await supabase
    .from("game_push_state")
    .select("checkin_headcount, target")
    .eq("game_id", row.game_id)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();

  if (stateError) {
    console.error("Check-in badge stale check failed — game_push_state", row.id, stateError.message);
    return true;
  }

  if (!state) {
    return true;
  }

  return isStaleCheckinRowForMilestone(
    row.event_type,
    state.checkin_headcount ?? 0,
    state.target ?? 0,
    cycleAt,
  );
}
