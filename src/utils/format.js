export function displayPlayerName(entry, profileId) {
  if (profileId && entry.userId === profileId) return "You";
  return entry.name;
}

export function formatKitSuffix(entry) {
  return entry.bringingKit ? " · kit" : "";
}

export function formatChipExtras(entry) {
  let extras = "";
  if (entry.plusOnes > 0) extras += ` +${entry.plusOnes}`;
  if (entry.bringingKit) extras += " · kit";
  return extras;
}

export function formatSignedUpLabel(count) {
  if (count === 1) return "1 has signed up";
  return `${count} have signed up`;
}

export function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function countPlayers(entriesByGame, gameId) {
  return (entriesByGame[gameId] || []).reduce((sum, entry) => sum + 1 + (entry.plusOnes || 0), 0);
}

export function countWalkIns(guests, gameId) {
  return (guests[gameId] || []).length;
}

export function countHeadcount(checkIns, guests, gameId) {
  return countPlayers(checkIns, gameId) + countWalkIns(guests, gameId);
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
