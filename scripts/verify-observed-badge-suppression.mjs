import { computeBadgeMilestone } from "../src/utils/badgeMilestone.js";
import {
  emptyObservedAlerts,
  shouldSuppressPush,
} from "../src/lib/observedAlerts.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const CYCLE = "2026-05-21T01:00:00.000Z";
const GAME_ID = "game-1";

function observedWithRanks({ rsvpRank = 0, checkinRank = 0 } = {}) {
  const observed = emptyObservedAlerts();
  observed.games[GAME_ID] = {
    cycleAt: CYCLE,
    rsvpRank,
    checkinRank,
    phaseLive: false,
    cancelled: false,
  };
  return observed;
}

// computeBadgeMilestone aligns with server ladder
assert(computeBadgeMilestone(6, 8) === 1, "almost rank for target 8");
assert(computeBadgeMilestone(8, 8) === 2, "go rank for target 8");
assert(computeBadgeMilestone(12, 8) === 3, "live_some rank for target 8");
assert(computeBadgeMilestone(16, 8) === 4, "live_full rank for target 8");

// fail open without eventType
assert(
  !shouldSuppressPush({
    eventType: null,
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 4 }),
  }),
  "missing eventType should not suppress",
);

// suppress rsvp_go when observed go
assert(
  shouldSuppressPush({
    eventType: "rsvp_go",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 2 }),
  }),
  "rsvp_go suppressed at rank 2",
);

// monotonic: go suppresses almost
assert(
  shouldSuppressPush({
    eventType: "rsvp_almost",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 2 }),
  }),
  "rsvp_almost suppressed when go observed",
);

// do not suppress higher tier than observed
assert(
  !shouldSuppressPush({
    eventType: "rsvp_surge_some",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 2 }),
  }),
  "surge_some not suppressed when only go observed",
);

// cycle mismatch fail open
assert(
  !shouldSuppressPush({
    eventType: "rsvp_go",
    gameId: GAME_ID,
    cycleAt: "2026-05-28T01:00:00.000Z",
    observed: observedWithRanks({ rsvpRank: 2 }),
  }),
  "cycle mismatch should not suppress",
);

// check-in track independent
assert(
  shouldSuppressPush({
    eventType: "checkin_go",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 0, checkinRank: 2 }),
  }),
  "checkin_go suppressed on checkin track",
);

assert(
  !shouldSuppressPush({
    eventType: "checkin_go",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 4, checkinRank: 0 }),
  }),
  "rsvp rank does not suppress checkin_go",
);

// phase 2/3 events not suppressed in phase 1
assert(
  !shouldSuppressPush({
    eventType: "phase_live",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 4, checkinRank: 4 }),
  }),
  "phase_live not suppressed in phase 1",
);

console.log("verify-observed-badge-suppression: all checks passed");
