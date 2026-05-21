const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_AFTER_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function parseWeekdayFromTime(timeStr) {
  const match = timeStr?.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/i);
  if (!match) return null;

  const key = match[1].slice(0, 3).toLowerCase();
  return WEEKDAY_MAP[key] ?? null;
}

export function parseClockFromTime(timeStr) {
  const match = timeStr?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return { hour, minute };
}

/** UTC instant of the pickup instance RSVPs currently count toward. */
export function getCurrentRsvpCycleStartUtc(startsAt, now = new Date()) {
  const anchor = Date.parse(startsAt);
  if (Number.isNaN(anchor)) return null;

  const nowMs = now.getTime();
  let occurrence = anchor;

  while (occurrence + RESET_AFTER_MS <= nowMs) {
    occurrence += WEEK_MS;
  }

  return new Date(occurrence).toISOString();
}

export function normalizeCycleAt(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

/**
 * Derive a weekly UTC anchor from a display string like "Wed 6:00 PM".
 * Uses the given IANA timezone for wall-clock interpretation (default Pacific).
 */
export function deriveWeeklyAnchorUtc(
  timeStr,
  { timeZone = "America/Los_Angeles", now = new Date() } = {},
) {
  const weekday = parseWeekdayFromTime(timeStr);
  const clock = parseClockFromTime(timeStr);
  if (weekday == null || !clock) return null;

  const todayYmd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const todayDow = weekdayFromYmd(todayYmd);
  let daysUntil = (weekday - todayDow + 7) % 7;

  const timeParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const nowHour = Number(timeParts.find((p) => p.type === "hour")?.value ?? 0);
  const nowMinute = Number(timeParts.find((p) => p.type === "minute")?.value ?? 0);
  const nowMinutes = nowHour * 60 + nowMinute;
  const targetMinutes = clock.hour * 60 + clock.minute;

  if (daysUntil === 0 && nowMinutes >= targetMinutes) {
    daysUntil = 7;
  }

  const targetYmd = addDaysYmd(todayYmd, daysUntil);
  return zonedTimeToUtcIso(targetYmd, clock.hour, clock.minute, timeZone);
}

function weekdayFromYmd(ymd) {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDaysYmd(ymd, days) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function zonedTimeToUtcIso(ymd, hour, minute, timeZone) {
  const guess = new Date(`${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
  const offsetMinutes = getTimeZoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offsetMinutes * 60 * 1000).toISOString();
}

function getTimeZoneOffsetMinutes(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(instant);

  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}
