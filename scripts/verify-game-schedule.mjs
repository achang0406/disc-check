import {
  deriveWeeklyAnchorUtc,
  getCurrentRsvpCycleStartUtc,
  parseClockFromTime,
  parseWeekdayFromTime,
} from "../src/utils/gameSchedule.js";
import { formatGameTime, getTimeSlot } from "../src/utils/time.js";
import { parseCityFromAddress } from "../src/utils/location.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

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
  const cycle = getCurrentRsvpCycleStartUtc(ANCHOR, new Date(testCase.now));
  assert(
    cycle === testCase.expected,
    `${testCase.label}: expected ${testCase.expected}, got ${cycle}`,
  );
}

assert(parseWeekdayFromTime("Wed 6:00 PM") === 3, "parse Wed");
assert(parseClockFromTime("Wed 6:00 PM")?.hour === 18, "parse 6 PM");

const derived = deriveWeeklyAnchorUtc("Wed 6:00 PM", {
  now: new Date("2026-05-18T19:00:00.000Z"),
});
assert(derived === ANCHOR, `derive anchor: expected ${ANCHOR}, got ${derived}`);

assert(formatGameTime(ANCHOR) === "Wed 6:00 PM", `format game time: got ${formatGameTime(ANCHOR)}`);
assert(getTimeSlot(ANCHOR) === "evening", "Wed 6 PM is evening");
assert(parseCityFromAddress("11100 NE 68th St, Kirkland, WA 98033") === "Kirkland", "parse city");

console.log(`All ${cases.length + 6} game schedule checks passed.`);
