export const PRESENCE_CHANNEL = "disc-check:presence";

export const CURSOR_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
];

export const CHAT_TTL_MS = 3000;
export const CURSOR_THROTTLE_MS = 50;
export const CURSOR_IDLE_MS = 5000;
export const DRAFT_THROTTLE_MS = 80;
export const MAX_CHAT_LENGTH = 120;

export function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export function getPresenceSessionId(profile) {
  if (profile?.id) return profile.id;

  const key = "disc_presence_session";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function getPresenceColor(profile) {
  if (profile?.bubbleColor) return profile.bubbleColor;
  return colorForId(getPresenceSessionId(profile));
}

export function getPresenceName(profile) {
  if (profile?.name) return profile.name;
  const sessionId = getPresenceSessionId(profile);
  return `Guest ${sessionId.slice(-4)}`;
}

export function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
