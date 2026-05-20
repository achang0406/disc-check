export function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function countPlayers(rsvps, gameId) {
  return (rsvps[gameId] || []).reduce((sum, entry) => sum + 1 + (entry.plusOnes || 0), 0);
}

export function totalRsvpCount(rsvps) {
  return Object.values(rsvps).reduce(
    (sum, entries) => sum + entries.reduce((acc, entry) => acc + 1 + (entry.plusOnes || 0), 0),
    0,
  );
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
