import { appendChatMessage, trimChatMessages } from "./chatCache.js";

const CACHE_NAME = "disc-check-push-v1";
const MESSAGE_PATH = "/__push-message__";

function messageRequest(gameId, messageId) {
  const origin =
    typeof self !== "undefined" && self.location?.origin
      ? self.location.origin
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
  return new Request(`${origin}${MESSAGE_PATH}/${gameId}/${messageId}`);
}

function normalizePushMessage(raw) {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" ? raw.id : null;
  const senderId = typeof raw.senderId === "string" ? raw.senderId : null;
  const name = typeof raw.name === "string" ? raw.name : null;
  const color = typeof raw.color === "string" ? raw.color : "#888888";
  const text = typeof raw.text === "string" ? raw.text : null;
  const createdAt = Number(raw.createdAt);

  if (!id || !senderId || !name || !text || !Number.isFinite(createdAt)) {
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

export async function stashPushMessage(gameId, message) {
  const normalized = normalizePushMessage(message);
  if (!gameId || !normalized) return false;

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(messageRequest(gameId, normalized.id), new Response(JSON.stringify(normalized)));
    return true;
  } catch {
    return false;
  }
}

export async function consumePushMessagesForGame(gameId) {
  if (!gameId) return [];

  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const prefix = `${MESSAGE_PATH}/${gameId}/`;
    const messages = [];

    for (const request of keys) {
      const path = new URL(request.url).pathname;
      if (!path.startsWith(prefix)) continue;

      const response = await cache.match(request);
      if (!response) continue;

      const normalized = normalizePushMessage(await response.json());
      if (normalized) {
        messages.push(normalized);
      }
      await cache.delete(request);
    }

    messages.sort((a, b) => a.createdAt - b.createdAt);
    return messages;
  } catch {
    return [];
  }
}

export function mergePushMessageIntoCache(gameId, existingMessages, message) {
  const normalized = normalizePushMessage(message);
  if (!gameId || !normalized) return existingMessages;
  return appendChatMessage(existingMessages, normalized);
}

export function mergePushMessagesIntoCache(gameId, existingMessages, incoming) {
  let next = existingMessages;
  for (const message of incoming) {
    next = mergePushMessageIntoCache(gameId, next, message);
  }
  return trimChatMessages(next);
}
