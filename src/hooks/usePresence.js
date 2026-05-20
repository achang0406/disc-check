import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAT_TTL_MS,
  CURSOR_THROTTLE_MS,
  DRAFT_THROTTLE_MS,
  MAX_CHAT_LENGTH,
  PRESENCE_CHANNEL,
  getPresenceColor,
  getPresenceName,
  getPresenceSessionId,
  isEditableTarget,
} from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";

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

export function usePresence(profile) {
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

  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({
      type: "broadcast",
      event,
      payload: {
        ...payload,
        id: identityRef.current.id,
        name: identityRef.current.name,
        color: identityRef.current.color,
      },
    });
  }, []);

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
      setOthers(presenceStateToUsers(channel.presenceState(), selfId));
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
            x: 0.5,
            y: 0.5,
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
  }, [color, displayName, sessionId]);

  useEffect(() => {
    if (!connected || !channelRef.current) return;

    channelRef.current.track({
      id: sessionId,
      name: displayName,
      color,
      x: cursorRef.current.x,
      y: cursorRef.current.y,
    });
  }, [color, connected, displayName, sessionId]);

  useEffect(() => {
    if (!connected) return undefined;

    const onMove = (event) => {
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;
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
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [broadcast, connected]);

  const broadcastDraft = useCallback(
    (message) => {
      const now = Date.now();
      if (now - lastDraftSentRef.current < DRAFT_THROTTLE_MS) return;
      lastDraftSentRef.current = now;

      const { x, y } = cursorRef.current;
      broadcast("chat_draft", { message, x, y });
    },
    [broadcast],
  );

  useEffect(() => {
    if (!connected) return undefined;

    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "Enter") {
        event.preventDefault();
        const message = draftRef.current.trim();
        if (!message) return;

        const { x, y } = cursorRef.current;
        setDraft("");
        draftRef.current = "";
        broadcast("chat_draft", { message: "", x, y });
        setLocalChat(createLocalChat(message, x, y));
        broadcast("chat", { message, x, y });
        return;
      }

      if (event.key === "Escape") {
        setDraft("");
        draftRef.current = "";
        const { x, y } = cursorRef.current;
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
  }, [broadcast, broadcastDraft, connected]);

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
    self: { id: sessionId, name: displayName, color },
  };
}
