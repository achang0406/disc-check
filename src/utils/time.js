import { WEEKDAY_SHORT } from "../constants/gameSchedule.js";
import { getGameSchedule, parseStartTime } from "./gameSchedule.js";

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

export function getTimeSlot(game) {
  const schedule = getGameSchedule(game);
  if (!schedule) return "other";

  const clock = parseStartTime(schedule.startTime);
  if (!clock) return "other";

  if (clock.hour < 12) return "morning";
  if (clock.hour < 17) return "afternoon";
  return "evening";
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
