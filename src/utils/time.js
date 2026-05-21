export const GAME_TIME_ZONE = "America/Los_Angeles";

export const TIME_LABELS = {
  morning: "🌅 morning",
  afternoon: "☀️ afternoon",
  evening: "🌙 evening",
};

export function formatGameTime(startsAt, timeZone = GAME_TIME_ZONE) {
  if (!startsAt) return "";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${weekday} ${time}`;
}

export function getTimeSlot(startsAt, timeZone = GAME_TIME_ZONE) {
  if (!startsAt) return "other";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "other";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function toDatetimeLocalInput(iso) {
  if (!iso) return "";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
