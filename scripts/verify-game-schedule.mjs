import {
  getCurrentRsvpCycleStartUtc,
  isGameLive,
  isRsvpOpen,
  parseStartTime,
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
    label: "Thursday morning still counts toward this Wed (until 24h after start)",
    now: "2026-05-21T09:00:00.000Z",
    expected: ANCHOR,
  },
  {
    label: "Friday after reset flips to next Wed",
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
assert(isGameLive(WEDNESDAY_EVENING, new Date("2026-05-21T01:00:00.000Z")), "at start is live");
assert(isGameLive(WEDNESDAY_EVENING, new Date("2026-05-21T09:00:00.000Z")), "during live window");
assert(
  !isGameLive(WEDNESDAY_EVENING, new Date("2026-05-22T13:00:00.000Z")),
  "after live window is not live",
);
assert(isRsvpOpen(WEDNESDAY_EVENING, new Date("2026-05-20T19:00:00.000Z")), "before start RSVP open");
assert(
  !isRsvpOpen(WEDNESDAY_EVENING, new Date("2026-05-21T01:00:00.000Z")),
  "at start RSVP closed",
);

console.log(`All ${cases.length + 10} game schedule checks passed.`);
