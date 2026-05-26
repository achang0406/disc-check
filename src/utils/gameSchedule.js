import { DEFAULT_GAME_TIMEZONE } from "../constants/gameSchedule.js";

export const RESET_AFTER_MS = 12 * 60 * 60 * 1000;
export const GAME_LIVE_MS = 3 * 60 * 60 * 1000;
export const LANDING_PRIORITY_BEFORE_MS = 3 * 60 * 60 * 1000;
export const STARTING_SOON_MS = 30 * 60 * 1000;
export const GAME_START_COUNTDOWN_MS = 3 * 60 * 1000;

export function getGameSchedule(game) {
  if (!game || game.weekday == null || !game.startTime) return null;

  return {
    weekday: Number(game.weekday),
    startTime: game.startTime,
    timezone: game.timezone || DEFAULT_GAME_TIMEZONE,
  };
}

export function parseStartTime(value) {
  if (value == null || value === "") return null;

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

/** UTC instant of the pickup instance RSVPs currently count toward. */
export function getCurrentRsvpCycleStartUtc(game, now = new Date()) {
  const schedule = getGameSchedule(game);
  if (!schedule) return null;

  const clock = parseStartTime(schedule.startTime);
  if (!clock) return null;

  const todayYmd = formatYmdInTimeZone(now, schedule.timezone);
  const todayDow = weekdayFromYmd(todayYmd);
  const daysBack = (todayDow - schedule.weekday + 7) % 7;
  let candidateYmd = addDaysYmd(todayYmd, -daysBack);
  let occurrenceIso = zonedTimeToUtcIso(
    candidateYmd,
    clock.hour,
    clock.minute,
    schedule.timezone,
  );
  let occurrenceMs = Date.parse(occurrenceIso);

  if (occurrenceMs > now.getTime()) {
    candidateYmd = addDaysYmd(candidateYmd, -7);
    occurrenceIso = zonedTimeToUtcIso(
      candidateYmd,
      clock.hour,
      clock.minute,
      schedule.timezone,
    );
    occurrenceMs = Date.parse(occurrenceIso);
  }

  const nowMs = now.getTime();
  while (occurrenceMs + RESET_AFTER_MS <= nowMs) {
    candidateYmd = addDaysYmd(candidateYmd, 7);
    occurrenceIso = zonedTimeToUtcIso(
      candidateYmd,
      clock.hour,
      clock.minute,
      schedule.timezone,
    );
    occurrenceMs = Date.parse(occurrenceIso);
  }

  return new Date(occurrenceMs).toISOString();
}

/** UTC instant when the current pickup occurrence started. */
export function getOccurrenceStartUtc(game, now = new Date()) {
  return getCurrentRsvpCycleStartUtc(game, now);
}

export function normalizeCycleAt(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

/** True when DB rsvp_cycle_at has not caught up to the computed current cycle. */
export function isGameCycleStale(game, now = new Date()) {
  const storedCycle = normalizeCycleAt(game?.rsvpCycleAt);
  if (!storedCycle) return false;

  const currentCycle = normalizeCycleAt(getCurrentRsvpCycleStartUtc(game, now));
  return Boolean(currentCycle && storedCycle !== currentCycle);
}

/** Cycle used for pickup results and phase timing (stored cycle while stale). */
export function getDisplayCycleStartUtc(game, now = new Date()) {
  const storedCycle = normalizeCycleAt(game?.rsvpCycleAt);
  if (storedCycle && isGameCycleStale(game, now)) {
    return storedCycle;
  }

  return getCurrentRsvpCycleStartUtc(game, now);
}

function getPhaseOccurrenceStartMs(game, now = new Date()) {
  const cycleIso = getDisplayCycleStartUtc(game, now);
  return cycleIso ? Date.parse(cycleIso) : Number.POSITIVE_INFINITY;
}

/** True from 30m before start until the final countdown window (3m). */
export function showsStartingSoonLabel(game, now = new Date()) {
  if (!game || game.status === "cancelled") return false;
  if (isGameCycleStale(game, now)) return false;

  const remaining = getMsUntilStart(game, now);
  if (remaining == null) return false;

  return remaining > GAME_START_COUNTDOWN_MS && remaining <= STARTING_SOON_MS;
}

/** True from game start until 3h after start (active pickup window). */
export function isGameLive(game, now = new Date()) {
  if (isGameCycleStale(game, now)) return false;

  const startMs = getPhaseOccurrenceStartMs(game, now);
  if (!Number.isFinite(startMs)) return false;

  const nowMs = now.getTime();
  return nowMs >= startMs && nowMs < startMs + GAME_LIVE_MS;
}

/** True from 3h after start until reset clears the cycle (same week, or stale until reset). */
export function isGameEnded(game, now = new Date()) {
  if (isGameCycleStale(game, now)) {
    const storedMs = Date.parse(normalizeCycleAt(game.rsvpCycleAt));
    if (!Number.isFinite(storedMs)) return false;
    return now.getTime() >= storedMs + GAME_LIVE_MS;
  }

  const startMs = getPhaseOccurrenceStartMs(game, now);
  if (!Number.isFinite(startMs)) return false;

  const nowMs = now.getTime();
  return nowMs >= startMs + GAME_LIVE_MS && nowMs < startMs + RESET_AFTER_MS;
}

export function isRsvpOpen(game, now = new Date()) {
  if (isGameCycleStale(game, now)) return false;
  return !isGameLive(game, now) && !isGameEnded(game, now);
}

/** True when live or within 3 hours of the current occurrence start. */
export function isLandingPriorityGame(game, now = new Date()) {
  if (isGameCycleStale(game, now)) return false;

  const startMs = getOccurrenceStartMs(game, now);
  if (!Number.isFinite(startMs)) return false;

  const nowMs = now.getTime();
  if (nowMs >= startMs && nowMs < startMs + GAME_LIVE_MS) return true;

  return nowMs < startMs && startMs - nowMs <= LANDING_PRIORITY_BEFORE_MS;
}

export function getOccurrenceStartMs(game, now = new Date()) {
  const occurrenceIso = getCurrentRsvpCycleStartUtc(game, now);
  return occurrenceIso ? Date.parse(occurrenceIso) : Number.POSITIVE_INFINITY;
}

export function getMsUntilStart(game, now = new Date()) {
  const startMs = getOccurrenceStartMs(game, now);
  if (!Number.isFinite(startMs)) return null;

  const remaining = startMs - now.getTime();
  return remaining > 0 ? remaining : null;
}

/** Milliseconds until start when inside the final 3 minutes; otherwise null. */
export function getCountdownToStartMs(game, now = new Date()) {
  if (!game || game.status === "cancelled") return null;
  if (isGameCycleStale(game, now)) return null;

  const remaining = getMsUntilStart(game, now);
  if (remaining == null || remaining > GAME_START_COUNTDOWN_MS) return null;

  return remaining;
}

export function isGameStartingSoon(game, now = new Date()) {
  return getCountdownToStartMs(game, now) != null;
}

export function compareGamesForLanding(a, b, now = new Date()) {
  const aPriority = isLandingPriorityGame(a, now);
  const bPriority = isLandingPriorityGame(b, now);
  if (aPriority !== bPriority) return aPriority ? -1 : 1;

  const startDiff = getOccurrenceStartMs(a, now) - getOccurrenceStartMs(b, now);
  if (startDiff !== 0) return startDiff;

  return a.id.localeCompare(b.id);
}

export function sortGamesForLanding(games, now = new Date()) {
  return [...games].sort((a, b) => compareGamesForLanding(a, b, now));
}

function formatYmdInTimeZone(instant, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
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
  const guess = new Date(
    `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`,
  );
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

  const offsetPart = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offsetPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 60 + minutes);
}
