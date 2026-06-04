export const DEFAULT_GAME_TIMEZONE = "America/Los_Angeles";

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const WEEKDAY_OPTIONS = WEEKDAY_FULL.map((label, value) => ({
  value,
  label,
  shortLabel: WEEKDAY_SHORT[value],
}));

export const GAME_TIMEZONE_OPTIONS = [
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/New_York", label: "Eastern (ET)" },
];
