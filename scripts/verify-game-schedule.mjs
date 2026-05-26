import {
  compareGamesForLanding,
  getCountdownToStartMs,
  getCurrentRsvpCycleStartUtc,
  isGameCycleStale,
  isGameEnded,
  isGameLive,
  showsStartingSoonLabel,
  isGameStartingSoon,
  isLandingPriorityGame,
  isRsvpOpen,
  parseStartTime,
  sortGamesForLanding,
} from "../src/utils/gameSchedule.js";
import { formatGameTime, getTimeSlot } from "../src/utils/time.js";
import { parseCityFromAddress } from "../src/utils/location.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const WEDNESDAY_EVENING = {
  weekday: 3,
  startTime: "18:00:00",
  timezone: "America/Los_Angeles",
};

// Wed May 20 2026 6:00 PM Pacific (PDT) = Thu May 21 01:00 UTC
const ANCHOR = "2026-05-21T01:00:00.000Z";

const cases = [
  {
    label: "Monday before Wed game counts toward this Wed",
    now: "2026-05-18T19:00:00.000Z",
    expected: ANCHOR,
  },
  {
    label: "Wednesday game day keeps this week cycle",
    now: "2026-05-20T19:00:00.000Z",
    expected: ANCHOR,
  },
  {
    label: "Thursday morning still counts toward this Wed (until 12h after start)",
    now: "2026-05-21T09:00:00.000Z",
    expected: ANCHOR,
  },
  {
    label: "Thursday afternoon after 12h reset flips to next Wed",
    now: "2026-05-21T13:00:00.000Z",
    expected: "2026-05-28T01:00:00.000Z",
  },
  {
    label: "Friday after reset counts toward next Wed",
    now: "2026-05-22T13:00:00.000Z",
    expected: "2026-05-28T01:00:00.000Z",
  },
];

for (const testCase of cases) {
  const cycle = getCurrentRsvpCycleStartUtc(WEDNESDAY_EVENING, new Date(testCase.now));
  assert(
    cycle === testCase.expected,
    `${testCase.label}: expected ${testCase.expected}, got ${cycle}`,
  );
}

assert(parseStartTime("18:00:00")?.hour === 18, "parse 6 PM");
assert(parseStartTime("18:00")?.minute === 0, "parse minutes");

assert(
  formatGameTime(WEDNESDAY_EVENING) === "Wed 6:00 PM",
  `format game time: got ${formatGameTime(WEDNESDAY_EVENING)}`,
);
assert(getTimeSlot(WEDNESDAY_EVENING) === "evening", "Wed 6 PM is evening");
assert(parseCityFromAddress("11100 NE 68th St, Kirkland, WA 98033") === "Kirkland", "parse city");

assert(
  !isGameLive(WEDNESDAY_EVENING, new Date("2026-05-20T19:00:00.000Z")),
  "before start is not live",
);
assert(
  showsStartingSoonLabel(WEDNESDAY_EVENING, new Date("2026-05-21T00:40:00.000Z")),
  "20m before start shows starting soon",
);
assert(
  !showsStartingSoonLabel(WEDNESDAY_EVENING, new Date("2026-05-21T00:58:00.000Z")),
  "2m before start hides starting soon for countdown",
);
assert(
  !showsStartingSoonLabel(WEDNESDAY_EVENING, new Date("2026-05-21T00:15:00.000Z")),
  "45m before start is not starting soon",
);
assert(isGameLive(WEDNESDAY_EVENING, new Date("2026-05-21T01:00:00.000Z")), "at start is live");
assert(isGameLive(WEDNESDAY_EVENING, new Date("2026-05-21T03:00:00.000Z")), "2h after start is live");
assert(
  !isGameLive(WEDNESDAY_EVENING, new Date("2026-05-21T09:00:00.000Z")),
  "8h after start is not live",
);
assert(
  isGameEnded(WEDNESDAY_EVENING, new Date("2026-05-21T09:00:00.000Z")),
  "8h after start is ended",
);
assert(
  !isGameEnded(WEDNESDAY_EVENING, new Date("2026-05-21T03:00:00.000Z")),
  "during live is not ended",
);
assert(
  !isGameLive(WEDNESDAY_EVENING, new Date("2026-05-22T13:00:00.000Z")),
  "after live window is not live",
);
assert(isRsvpOpen(WEDNESDAY_EVENING, new Date("2026-05-20T19:00:00.000Z")), "before start RSVP open");
assert(
  !isRsvpOpen(WEDNESDAY_EVENING, new Date("2026-05-21T01:00:00.000Z")),
  "at start RSVP closed",
);
assert(
  !isRsvpOpen(WEDNESDAY_EVENING, new Date("2026-05-21T09:00:00.000Z")),
  "during ended RSVP closed",
);

const WEDNESDAY_GAME = {
  id: "g_test",
  ...WEDNESDAY_EVENING,
  rsvpCycleAt: ANCHOR,
};

assert(
  isGameEnded(WEDNESDAY_GAME, new Date("2026-05-21T09:00:00.000Z")),
  "synced game with stored cycle is ended",
);
assert(
  isGameCycleStale(WEDNESDAY_GAME, new Date("2026-05-22T13:00:00.000Z")),
  "stored cycle behind clock is stale",
);
assert(
  isGameEnded(WEDNESDAY_GAME, new Date("2026-05-22T13:00:00.000Z")),
  "stale cycle stays ended until reset",
);
assert(
  !isRsvpOpen(WEDNESDAY_GAME, new Date("2026-05-22T13:00:00.000Z")),
  "stale cycle keeps RSVP closed",
);

const syncedNextWeek = {
  id: "g_test",
  ...WEDNESDAY_EVENING,
  rsvpCycleAt: "2026-05-28T01:00:00.000Z",
};
assert(
  isRsvpOpen(syncedNextWeek, new Date("2026-05-22T13:00:00.000Z")),
  "after reset sync RSVP reopens",
);
assert(
  !isGameCycleStale(syncedNextWeek, new Date("2026-05-22T13:00:00.000Z")),
  "synced stored cycle is not stale",
);

assert(
  getCountdownToStartMs(WEDNESDAY_EVENING, new Date("2026-05-21T00:59:30.000Z")) === 30_000,
  "30s before start shows countdown",
);
assert(
  getCountdownToStartMs(WEDNESDAY_EVENING, new Date("2026-05-21T00:57:00.000Z")) === 180_000,
  "3m before start shows countdown",
);
assert(
  getCountdownToStartMs(WEDNESDAY_EVENING, new Date("2026-05-21T00:56:00.000Z")) == null,
  "4m before start hides countdown",
);
assert(
  getCountdownToStartMs(WEDNESDAY_EVENING, new Date("2026-05-21T01:00:00.000Z")) == null,
  "at start hides countdown",
);
assert(
  isGameStartingSoon(WEDNESDAY_EVENING, new Date("2026-05-21T00:59:30.000Z")),
  "starting soon inside final minute",
);

const THURSDAY_EVENING = {
  weekday: 4,
  startTime: "18:00:00",
  timezone: "America/Los_Angeles",
};

const wedStart = new Date("2026-05-21T01:00:00.000Z");
const twoHoursBeforeWed = new Date("2026-05-20T23:00:00.000Z");
const fourHoursBeforeWed = new Date("2026-05-20T21:00:00.000Z");

assert(isLandingPriorityGame(WEDNESDAY_EVENING, wedStart), "live game is landing priority");
assert(
  isLandingPriorityGame(WEDNESDAY_EVENING, twoHoursBeforeWed),
  "within 3 hours before start is landing priority",
);
assert(
  !isLandingPriorityGame(WEDNESDAY_EVENING, fourHoursBeforeWed),
  "more than 3 hours before start is not landing priority",
);

const sorted = sortGamesForLanding(
  [
    { id: "b", ...THURSDAY_EVENING },
    { id: "a", ...WEDNESDAY_EVENING },
  ],
  twoHoursBeforeWed,
);
assert(sorted[0].id === "a", "earlier start wins among landing-priority games");

const sortedLive = sortGamesForLanding(
  [
    { id: "late-live", weekday: 3, startTime: "18:00:00", timezone: "America/Los_Angeles" },
    { id: "early-live", weekday: 3, startTime: "16:00:00", timezone: "America/Los_Angeles" },
  ],
  new Date("2026-05-21T01:30:00.000Z"),
);
assert(sortedLive[0].id === "early-live", "earlier live start wins when both are live");

const sortedUpcoming = sortGamesForLanding(
  [
    { id: "later", weekday: 5, startTime: "18:00:00", timezone: "America/Los_Angeles" },
    { id: "sooner", weekday: 4, startTime: "18:00:00", timezone: "America/Los_Angeles" },
  ],
  new Date("2026-05-18T19:00:00.000Z"),
);
assert(sortedUpcoming[0].id === "sooner", "next upcoming game sorts first");
assert(
  compareGamesForLanding(sortedUpcoming[0], sortedUpcoming[1], new Date("2026-05-18T19:00:00.000Z")) < 0,
  "compareGamesForLanding matches upcoming order",
);

console.log(`All ${cases.length + 36} game schedule checks passed.`);
