/** Mirrors supabase/functions/_shared/badgePush.ts and SQL compute_badge_milestone. */

export const RSVP_BADGE_EVENT_TYPES = new Set([
  "rsvp_almost",
  "rsvp_go",
  "rsvp_surge_some",
  "rsvp_surge_full",
  "badge_almost",
  "badge_go",
]);

export const CHECKIN_BADGE_EVENT_TYPES = new Set([
  "checkin_almost",
  "checkin_go",
  "checkin_live_some",
  "checkin_live_full",
  "badge_live_some",
  "badge_live_full",
]);

const RSVP_BADGE_EVENT_RANK = {
  rsvp_almost: 1,
  rsvp_go: 2,
  rsvp_surge_some: 3,
  rsvp_surge_full: 4,
  badge_almost: 1,
  badge_go: 2,
};

const CHECKIN_BADGE_EVENT_RANK = {
  checkin_almost: 1,
  checkin_go: 2,
  checkin_live_some: 3,
  checkin_live_full: 4,
  badge_live_some: 3,
  badge_live_full: 4,
};

/** Shared 4-tier milestone ladder (ranks 0–4). */
export function computeBadgeMilestone(headcount, target) {
  const tierFull = Math.ceil(target * 2);
  const tierSome = Math.ceil(target * 1.5);

  if (headcount >= tierFull) return 4;
  if (headcount >= tierSome) return 3;
  if (headcount >= target) return 2;
  if (headcount >= Math.max(1, target - 2)) return 1;
  return 0;
}

export function isRsvpBadgeEventType(eventType) {
  return RSVP_BADGE_EVENT_TYPES.has(eventType);
}

export function isCheckinBadgeEventType(eventType) {
  return CHECKIN_BADGE_EVENT_TYPES.has(eventType);
}

export function rsvpBadgeEventRank(eventType) {
  return RSVP_BADGE_EVENT_RANK[eventType] ?? 0;
}

export function checkinBadgeEventRank(eventType) {
  return CHECKIN_BADGE_EVENT_RANK[eventType] ?? 0;
}
