import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_TTL_MS,
  CURSOR_THROTTLE_MS,
  DRAFT_THROTTLE_MS,
  MAX_CHAT_LENGTH,
  PRESENCE_CHANNEL,
  getPresenceColor,
  getPresenceMode,
  getPresenceName,
  getPresenceSessionId,
  isEditableTarget,
} from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import { useIsMobile } from "./useIsMobile.js";

function createLocalChat(message, x, y) {
  return {
    message,
    x,
    y,
    expiresAt: Date.now() + CHAT_TTL_MS,
  };
}

function mergeRemoteUser(existing, incoming) {
  return {
    id: incoming.id,
    name: incoming.name ?? existing?.name ?? "Guest",
    color: incoming.color ?? existing?.color ?? "#888",
    x: incoming.x ?? existing?.x ?? 0.5,
    y: incoming.y ?? existing?.y ?? 0.5,
    mode: incoming.mode ?? existing?.mode ?? "cursor",
    draft: incoming.draft !== undefined ? incoming.draft : existing?.draft || "",
    chat: incoming.chat !== undefined ? incoming.chat : existing?.chat ?? null,
  };
}

function presenceStateToUsers(state, selfId) {
  const users = {};

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      const user = presence;
      if (!user?.id || user.id === selfId) continue;
      users[user.id] = mergeRemoteUser(users[user.id], user);
    }
  }

  return users;
}

function isTouchIgnoredTarget(target) {
  if (isEditableTarget(target)) return true;
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(".mobile-chat-bar"));
}

export function usePresence(profile) {
  const isMobile = useIsMobile();
  const mode = getPresenceMode(isMobile);

  const [others, setOthers] = useState({});
  const [localChat, setLocalChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });

  const channelRef = useRef(null);
  const draftRef = useRef("");
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const lastSentRef = useRef(0);
  const lastDraftSentRef = useRef(0);
  const identityRef = useRef({
    id: getPresenceSessionId(profile),
    name: getPresenceName(profile),
    color: getPresenceColor(profile),
  });

  const sessionId = getPresenceSessionId(profile);
  const displayName = getPresenceName(profile);
  const color = getPresenceColor(profile);

  identityRef.current = { id: sessionId, name: displayName, color };

  const getPosition = useCallback(() => cursorRef.current, []);

  const broadcast = useCallback(
    (event, payload) => {
      channelRef.current?.send({
        type: "broadcast",
        event,
        payload: {
          ...payload,
          id: identityRef.current.id,
          name: identityRef.current.name,
          color: identityRef.current.color,
          mode,
        },
      });
    },
    [mode],
  );

  const updatePosition = useCallback(
    (clientX, clientY) => {
      const x = clientX / window.innerWidth;
      const y = clientY / window.innerHeight;
      const next = { x, y };

      cursorRef.current = next;
      setCursor(next);

      setLocalChat((current) =>
        current && current.expiresAt > Date.now() ? { ...current, x, y } : current,
      );

      const now = Date.now();
      if (now - lastSentRef.current < CURSOR_THROTTLE_MS) return;
      lastSentRef.current = now;
      broadcast("cursor", { x, y });
    },
    [broadcast],
  );

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;

    const supabase = getSupabase();
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: sessionId } },
    });

    const applyPresence = () => {
      const selfId = identityRef.current.id;
      const fromPresence = presenceStateToUsers(channel.presenceState(), selfId);

      setOthers((current) => {
        const next = { ...current };

        for (const [id, user] of Object.entries(fromPresence)) {
          next[id] = mergeRemoteUser(current[id], user);
        }

        for (const id of Object.keys(next)) {
          if (!fromPresence[id]) delete next[id];
        }

        return next;
      });
    };

    channel
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        if (payload.id === identityRef.current.id) return;
        setOthers((current) => ({
          ...current,
          [payload.id]: mergeRemoteUser(current[payload.id], payload),
        }));
      })
      .on("broadcast", { event: "chat_draft" }, ({ payload }) => {
        if (payload.id === identityRef.current.id) return;
        setOthers((current) => ({
          ...current,
          [payload.id]: mergeRemoteUser(current[payload.id], {
            ...payload,
            draft: payload.message || "",
          }),
        }));
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (payload.id === identityRef.current.id) return;
        setOthers((current) => ({
          ...current,
          [payload.id]: mergeRemoteUser(current[payload.id], {
            ...payload,
            draft: "",
            chat: {
              message: payload.message,
              expiresAt: Date.now() + CHAT_TTL_MS,
            },
          }),
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel.track({
            id: sessionId,
            name: displayName,
            color,
            mode,
            x: cursorRef.current.x,
            y: cursorRef.current.y,
          });
          applyPresence();
          return;
        }

        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      setConnected(false);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [color, displayName, mode, sessionId]);

  useEffect(() => {
    if (!connected || !channelRef.current) return;

    channelRef.current.track({
      id: sessionId,
      name: displayName,
      color,
      mode,
      x: cursorRef.current.x,
      y: cursorRef.current.y,
    });
  }, [color, connected, displayName, mode, sessionId]);

  useEffect(() => {
    if (!connected || isMobile) return undefined;

    const onMove = (event) => {
      updatePosition(event.clientX, event.clientY);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [connected, isMobile, updatePosition]);

  useEffect(() => {
    if (!connected || !isMobile) return undefined;

    const onTouch = (event) => {
      if (isTouchIgnoredTarget(event.target)) return;
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) return;
      updatePosition(touch.clientX, touch.clientY);
    };

    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [connected, isMobile, updatePosition]);

  const broadcastDraft = useCallback(
    (message) => {
      const now = Date.now();
      if (now - lastDraftSentRef.current < DRAFT_THROTTLE_MS) return;
      lastDraftSentRef.current = now;

      const { x, y } = getPosition();
      broadcast("chat_draft", { message, x, y });
    },
    [broadcast, getPosition],
  );

  const sendChat = useCallback(
    (message) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const { x, y } = getPosition();
      setDraft("");
      draftRef.current = "";
      broadcast("chat_draft", { message: "", x, y });
      setLocalChat(createLocalChat(trimmed, x, y));
      broadcast("chat", { message: trimmed, x, y });
    },
    [broadcast, getPosition],
  );

  const setMobileDraft = useCallback(
    (value) => {
      const next = value.slice(0, MAX_CHAT_LENGTH);
      setDraft(next);
      draftRef.current = next;
      broadcastDraft(next);
    },
    [broadcastDraft],
  );

  useEffect(() => {
    if (!connected || isMobile) return undefined;

    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Enter") {
        event.preventDefault();
        sendChat(draftRef.current);
        return;
      }

      if (event.key === "Escape") {
        setDraft("");
        draftRef.current = "";
        const { x, y } = getPosition();
        broadcast("chat_draft", { message: "", x, y });
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setDraft((current) => {
          const next = current.slice(0, -1);
          draftRef.current = next;
          broadcastDraft(next);
          return next;
        });
        return;
      }

      if (event.key.length !== 1) return;
      event.preventDefault();

      setDraft((current) => {
        if (current.length >= MAX_CHAT_LENGTH) return current;
        const next = current + event.key;
        draftRef.current = next;
        broadcastDraft(next);
        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [broadcast, broadcastDraft, connected, getPosition, isMobile, sendChat]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();

      setLocalChat((current) => (current && current.expiresAt <= now ? null : current));
      setOthers((current) => {
        let changed = false;
        const next = { ...current };

        for (const [id, user] of Object.entries(current)) {
          if (user.chat && user.chat.expiresAt <= now) {
            changed = true;
            next[id] = { ...user, chat: null };
          }
        }

        return changed ? next : current;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return {
    others: Object.values(others),
    localChat,
    draft,
    cursor,
    connected,
    isMobile,
    setMobileDraft,
    sendChat,
    self: { id: sessionId, name: displayName, color, mode },
  };
}
