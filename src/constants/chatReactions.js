/** Canonical emoji allowlist — must match migration 047 CHECK constraint exactly. */
export const CHAT_REACTION_EMOJIS = [
  "❤️",
  "👍",
  "👎",
  "😂",
  "‼️",
  "❓",
  "🔥",
  "🎉",
  "👀",
  "💯",
  "🙏",
  "✨",
];

export const CHAT_TAPBACK_EMOJIS = CHAT_REACTION_EMOJIS.slice(0, 6);

export const CHAT_EXTRA_EMOJIS = CHAT_REACTION_EMOJIS.slice(6);

export const CHAT_REACTION_EMOJI_SET = new Set(CHAT_REACTION_EMOJIS);
