import { useEffect, useRef, useState } from "react";
import { APP_NAME } from "../constants/app.js";
import { isSubscribedToGroupChatPush } from "../lib/push.js";

function clearHomeScreenBadge() {
  if (typeof navigator !== "undefined" && "clearAppBadge" in navigator) {
    void navigator.clearAppBadge();
  }
}

function truncate(text, max = 48) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function useChatAlerts({ gameId, gameName, messages, selfId, enabled = true }) {
  const contextId = gameId;
  const unreadRef = useRef(0);
  const seenCountRef = useRef(0);
  const [chatPushEnabled, setChatPushEnabled] = useState(false);

  useEffect(() => {
    unreadRef.current = 0;
    seenCountRef.current = messages.length;
    document.title = APP_NAME;
    clearHomeScreenBadge();

    return () => {
      document.title = APP_NAME;
    };
  }, [contextId]);

  useEffect(() => {
    if (!enabled || !contextId || !selfId) {
      setChatPushEnabled(false);
      return undefined;
    }

    let cancelled = false;

    const syncPushPreference = async () => {
      const active = await isSubscribedToGroupChatPush({ groupId: contextId, subscriberId: selfId });
      if (!cancelled) {
        setChatPushEnabled(active);
      }
    };

    void syncPushPreference();

    const onPreferenceChange = (event) => {
      if (event.detail?.groupId !== contextId) return;
      void syncPushPreference();
    };

    window.addEventListener("disc-check-push-changed", onPreferenceChange);

    return () => {
      cancelled = true;
      window.removeEventListener("disc-check-push-changed", onPreferenceChange);
    };
  }, [contextId, enabled, selfId]);

  useEffect(() => {
    if (!enabled) return undefined;

    const clearUnread = () => {
      if (document.hidden) return;
      unreadRef.current = 0;
      document.title = APP_NAME;
      clearHomeScreenBadge();
    };

    document.addEventListener("visibilitychange", clearUnread);
    window.addEventListener("focus", clearUnread);

    return () => {
      document.removeEventListener("visibilitychange", clearUnread);
      window.removeEventListener("focus", clearUnread);
    };
  }, [enabled, contextId]);

  useEffect(() => {
    if (!enabled || !selfId || !chatPushEnabled) return;

    if (messages.length < seenCountRef.current) {
      seenCountRef.current = messages.length;
      return;
    }

    if (messages.length === seenCountRef.current) return;

    const pending = messages.slice(seenCountRef.current);
    seenCountRef.current = messages.length;

    const incoming = pending.filter((message) => message.senderId !== selfId);
    if (incoming.length === 0) return;

    const latest = incoming[incoming.length - 1];
    const preview = truncate(latest.text);

    if (document.hidden) {
      unreadRef.current += incoming.length;
      const count = unreadRef.current;
      document.title =
        count > 1
          ? `(${count}) ${preview} · ${APP_NAME}`
          : `${latest.name}: ${preview} · ${APP_NAME}`;
    }
  }, [chatPushEnabled, enabled, contextId, messages, selfId]);
}
