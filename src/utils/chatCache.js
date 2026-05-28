import { CHAT_CACHE_MAX_MESSAGES } from "../constants/presence.js";

const STORAGE_PREFIX = "disc_chat";

function cacheKey(gameId) {
  if (!gameId) return null;
  return `${STORAGE_PREFIX}:${gameId}`;
}

function normalizeMessage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" ? raw.id : null;
  const senderId = typeof raw.senderId === "string" ? raw.senderId : null;
  const name = typeof raw.name === "string" ? raw.name : null;
  const color = typeof raw.color === "string" ? raw.color : null;
  const text = typeof raw.text === "string" ? raw.text : null;
  const createdAt = Number(raw.createdAt);

  if (!id || !senderId || !name || !color || !text || !Number.isFinite(createdAt)) {
    return null;
  }

  return {
    id,
    senderId,
    name,
    color,
    text,
    createdAt,
    type: "user",
  };
}

export function trimChatMessages(messages, max = CHAT_CACHE_MAX_MESSAGES) {
  if (messages.length <= max) return messages;
  return messages.slice(messages.length - max);
}

export function appendChatMessage(messages, message, max = CHAT_CACHE_MAX_MESSAGES) {
  if (messages.some((entry) => entry.id === message.id)) {
    return messages;
  }

  return trimChatMessages([...messages, message], max);
}

export function loadChatCache(gameId) {
  const key = cacheKey(gameId);
  if (!key) return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return trimChatMessages(
      parsed.map(normalizeMessage).filter(Boolean),
    );
  } catch {
    return [];
  }
}

export function saveChatCache(gameId, messages) {
  const key = cacheKey(gameId);
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify(trimChatMessages(messages)));
  } catch {
    // Storage full or unavailable.
  }
}
