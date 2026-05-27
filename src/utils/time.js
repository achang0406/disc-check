import { WEEKDAY_SHORT } from "../constants/gameSchedule.js";
import { getGameSchedule, parseStartTime } from "./gameSchedule.js";

export const TIME_PERIOD_ICONS = {
  morning: "☀️",
  afternoon: "☀️",
  evening: "🌙",
};

export const TIME_PERIOD_TEXT = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const TIME_PERIOD_LABELS = {
  morning: `${TIME_PERIOD_ICONS.morning} ${TIME_PERIOD_TEXT.morning}`,
  afternoon: `${TIME_PERIOD_ICONS.afternoon} ${TIME_PERIOD_TEXT.afternoon}`,
  evening: `${TIME_PERIOD_ICONS.evening} ${TIME_PERIOD_TEXT.evening}`,
};

export function getTimePeriod(game) {
  const schedule = getGameSchedule(game);
  if (!schedule) return null;

  const clock = parseStartTime(schedule.startTime);
  if (!clock) return null;

  if (clock.hour < 12) return "morning";
  if (clock.hour < 17) return "afternoon";
  return "evening";
}

export function formatGameTime(game) {
  const schedule = getGameSchedule(game);
  if (!schedule) return "";

  const weekday = WEEKDAY_SHORT[schedule.weekday];
  if (!weekday) return "";

  const clock = parseStartTime(schedule.startTime);
  if (!clock) return weekday;

  const date = new Date(Date.UTC(2026, 0, 1, clock.hour, clock.minute));
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);

  return `${weekday} ${time}`;
}

/** @deprecated Use getTimePeriod for display; kept for schedule tests. */
export function getTimeSlot(game) {
  return getTimePeriod(game) ?? "other";
}

export function toTimeInputValue(startTime) {
  const clock = parseStartTime(startTime);
  if (!clock) return "";

  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
}

export function fromTimeInputValue(value) {
  const clock = parseStartTime(value);
  if (!clock) return null;

  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}:00`;
}

export function formatSchedulePreview(game) {
  const schedule = getGameSchedule(game);
  if (!schedule) return "";

  const weekday = WEEKDAY_SHORT[schedule.weekday];
  const time = formatGameTime(game);
  const zone =
    new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? schedule.timezone;

  return `Every ${weekday ?? "week"} at ${time.split(" ").slice(1).join(" ")} ${zone}`;
}
