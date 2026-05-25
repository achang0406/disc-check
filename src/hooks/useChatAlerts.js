import { useEffect, useRef } from "react";

const BASE_TITLE = "DiscCheck";

function truncate(text, max = 48) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function useChatAlerts({ gameId, gameName, messages, selfId, enabled = true }) {
  const unreadRef = useRef(0);
  const seenCountRef = useRef(0);

  useEffect(() => {
    unreadRef.current = 0;
    seenCountRef.current = messages.length;
    document.title = BASE_TITLE;

    return () => {
      document.title = BASE_TITLE;
    };
  }, [gameId]);

  useEffect(() => {
    if (!enabled) return undefined;

    const clearUnread = () => {
      if (document.hidden) return;
      unreadRef.current = 0;
      document.title = BASE_TITLE;
    };

    document.addEventListener("visibilitychange", clearUnread);
    window.addEventListener("focus", clearUnread);

    return () => {
      document.removeEventListener("visibilitychange", clearUnread);
      window.removeEventListener("focus", clearUnread);
    };
  }, [enabled, gameId]);

  useEffect(() => {
    if (!enabled || !selfId) return;

    if (messages.length < seenCountRef.current) {
      seenCountRef.current = messages.length;
      return;
    }

    if (messages.length === seenCountRef.current) return;

    const incoming = messages
      .slice(seenCountRef.current)
      .filter((message) => message.senderId !== selfId);

    seenCountRef.current = messages.length;
    if (incoming.length === 0) return;

    const latest = incoming[incoming.length - 1];
    const context = gameName?.trim() || "game chat";
    const preview = truncate(latest.text);

    if (document.hidden) {
      unreadRef.current += incoming.length;
      const count = unreadRef.current;
      document.title =
        count > 1
          ? `(${count}) ${preview} · ${BASE_TITLE}`
          : `${latest.name}: ${preview} · ${BASE_TITLE}`;

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const message of incoming) {
          new Notification(`${message.name} · ${context}`, {
            body: message.text,
            tag: `disc-check-chat-${gameId}-${message.id}`,
          });
        }
      }
    }
  }, [enabled, gameId, gameName, messages, selfId]);
}

export async function requestChatNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
