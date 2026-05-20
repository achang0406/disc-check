export function createEmptyRsvpMap(games) {
  return games.reduce((map, game) => {
    map[game.id] = [];
    return map;
  }, {});
}

export function deriveMyRsvps(rsvps, profileId) {
  if (!profileId) return {};

  const mine = {};
  for (const [gameId, entries] of Object.entries(rsvps)) {
    const entry = entries.find((item) => item.userId === profileId);
    if (entry) {
      mine[gameId] = { plusOnes: entry.plusOnes || 0 };
    }
  }
  return mine;
}
