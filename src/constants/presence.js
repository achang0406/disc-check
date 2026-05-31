export const PRESENCE_CHANNEL_PREFIX = "disc-check:presence";

export function getPresenceChannel(gameId) {
  if (!gameId) return null;
  return `${PRESENCE_CHANNEL_PREFIX}:${gameId}`;
}

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
export const CURSOR_THROTTLE_MS = 32;
export const DRAFT_THROTTLE_MS = 80;
export const MAX_CHAT_LENGTH = 120;
export const CHAT_CACHE_MAX_MESSAGES = 50;
export const SPEECH_BUBBLE_WRAP_CH = 22;
export const SPEECH_BUBBLE_EDGE_PADDING = 16;

const STACK_OFFSET_X = 10;
const CURSOR_TIP_TO_STACK_Y = 16;

/** Flip speech bubble alignment only when the measured bubble would overflow. */
export function getBubblePlacement(
  x,
  y,
  { bubbleWidth = 0, bubbleHeight = 0, hasBubble = false, nameWidth = 0 } = {},
) {
  if (typeof window === "undefined") {
    return { flipX: false, flipY: false };
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const px = x * vw;
  const py = y * vh;

  const contentWidth = hasBubble
    ? Math.max(bubbleWidth, nameWidth)
    : nameWidth;

  const flipX =
    contentWidth > 0 &&
    px + STACK_OFFSET_X + contentWidth + SPEECH_BUBBLE_EDGE_PADDING > vw;

  const stackHeight =
    hasBubble && bubbleHeight > 0
      ? CURSOR_TIP_TO_STACK_Y + 16 + bubbleHeight + 6
      : hasBubble
        ? 120
        : 24;

  const flipY = py + stackHeight + SPEECH_BUBBLE_EDGE_PADDING > vh;

  return { flipX, flipY };
}

export function getPresenceMode(isChatCursor) {
  return isChatCursor ? "cursor" : "thread";
}

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
