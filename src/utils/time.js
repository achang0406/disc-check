// morning: before noon | afternoon: noon–5pm | evening: 5pm+
export function getTimeSlot(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "other";

  let hour = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
