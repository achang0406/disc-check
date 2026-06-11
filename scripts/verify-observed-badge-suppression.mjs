import { computeBadgeMilestone } from "../src/utils/badgeMilestone.js";
import {
  emptyObservedAlerts,
  pruneObservedGames,
  recordGameBadgeObservations,
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

// recordGameBadgeObservations uses same headcount path as GameCommitCard
const observed = emptyObservedAlerts();
const now = new Date("2026-05-18T19:00:00.000Z");
const game = {
  id: GAME_ID,
  target: 8,
  weekday: 3,
  startTime: "18:00:00",
  timezone: "America/Los_Angeles",
  rsvpCycleAt: CYCLE,
  status: "open",
};
const rsvps = {
  [GAME_ID]: [
    { userId: "u1", plusOnes: 0 },
    { userId: "u2", plusOnes: 0 },
    { userId: "u3", plusOnes: 0 },
    { userId: "u4", plusOnes: 0 },
    { userId: "u5", plusOnes: 0 },
    { userId: "u6", plusOnes: 0 },
    { userId: "u7", plusOnes: 0 },
    { userId: "u8", plusOnes: 0 },
  ],
};
const changed = recordGameBadgeObservations(observed, {
  games: [game],
  allGames: [game],
  rsvps,
  checkIns: {},
  guests: {},
  now,
});
assert(changed, "recording should update observed state");
assert(observed.games[GAME_ID].rsvpRank === 2, "eight RSVPs should observe go rank");

// prune removes orphan games
observed.games["deleted-game"] = {
  cycleAt: CYCLE,
  rsvpRank: 2,
  checkinRank: 0,
  phaseLive: false,
  cancelled: false,
};
const pruned = pruneObservedGames(observed, { knownGameIds: [GAME_ID], now });
assert(pruned, "prune should remove orphan game");
assert(!observed.games["deleted-game"], "orphan game entry removed");

// legacy badge_go alias
assert(
  shouldSuppressPush({
    eventType: "badge_go",
    gameId: GAME_ID,
    cycleAt: CYCLE,
    observed: observedWithRanks({ rsvpRank: 2 }),
  }),
  "legacy badge_go suppressed at rank 2",
);

console.log("verify-observed-badge-suppression: all checks passed");
