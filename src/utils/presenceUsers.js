export const WATCHING_DOT_CAP = 4;

export function getPresenceUsers({ self, watchingPeers, connected }) {
  if (!connected || !self?.id) return [];

  const users = new Map([[self.id, { id: self.id, name: self.name, color: self.color }]]);

  for (const user of watchingPeers ?? []) {
    if (user?.id) {
      users.set(user.id, { id: user.id, name: user.name, color: user.color });
    }
  }

  return [...users.values()].sort((a, b) => a.name.localeCompare(b.name));
}
