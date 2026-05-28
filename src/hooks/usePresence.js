import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHAT_TTL_MS,
  CURSOR_THROTTLE_MS,
  DRAFT_THROTTLE_MS,
  MAX_CHAT_LENGTH,
  getPresenceChannel,
  getPresenceColor,
  getPresenceMode,
  getPresenceName,
  getPresenceSessionId,
  isEditableTarget,
} from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import { appendChatMessage, loadChatCache, saveChatCache } from "../utils/chatCache.js";

function createLocalChat(message, x, y) {
  return {
    message,
    x,
    y,
    expiresAt: Date.now() + CHAT_TTL_MS,
  };
}

function createThreadMessage({ id, senderId, name, color, text, createdAt }) {
  return {
    id: id || `${senderId}-${createdAt || Date.now()}`,
    senderId,
    name,
    color,
    text,
    createdAt: createdAt || Date.now(),
    type: "user",
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

function isChatInput(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(".chat-bar__input"));
}

function isTouchIgnoredTarget(target) {
  if (isEditableTarget(target)) return true;
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(".chat-bar-anchor"));
}

export function usePresence(profile, gameId, isWide) {
  const mode = getPresenceMode(isWide);

  const [others, setOthers] = useState({});
  const [watchingPeers, setWatchingPeers] = useState({});
  const [localChat, setLocalChat] = useState(null);
  const [messages, setMessages] = useState(() => (gameId ? loadChatCache(gameId) : []));
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });

  const channelRef = useRef(null);
  const chatInputRef = useRef(null);
  const draftRef = useRef("");
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const lastSentRef = useRef(0);
  const lastDraftSentRef = useRef(0);
  const modeRef = useRef(mode);
  const watchingPeersRef = useRef({});
  const identityRef = useRef({
    id: getPresenceSessionId(profile),
    name: getPresenceName(profile),
    color: getPresenceColor(profile),
  });

  const sessionId = getPresenceSessionId(profile);
  const displayName = getPresenceName(profile);
  const color = getPresenceColor(profile);
  const channelName = getPresenceChannel(gameId);

  identityRef.current = { id: sessionId, name: displayName, color };
  modeRef.current = mode;

  const getPosition = useCallback(() => cursorRef.current, []);

  const broadcast = useCallback((event, payload) => {
    channelRef.current?.send({
      type: "broadcast",
      event,
      payload: {
        ...payload,
        id: identityRef.current.id,
        name: identityRef.current.name,
        color: identityRef.current.color,
        mode: modeRef.current,
      },
    });
  }, []);

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
    setOthers({});
    setWatchingPeers({});
    watchingPeersRef.current = {};
    setLocalChat(null);
    setDraft("");
    draftRef.current = "";
    setMessages(gameId ? loadChatCache(gameId) : []);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    if (messages.length === 0) return;
    saveChatCache(gameId, messages);
  }, [gameId, messages]);

  useEffect(() => {
    if (mode === "thread") {
      setLocalChat(null);
    }
  }, [mode]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !channelName) return undefined;

    const supabase = getSupabase();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: sessionId } },
    });

    const applyPresence = () => {
      const selfId = identityRef.current.id;
      const fromPresence = presenceStateToUsers(channel.presenceState(), selfId);

      watchingPeersRef.current = fromPresence;
      setWatchingPeers(fromPresence);

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
        if (!watchingPeersRef.current[payload.id]) return;
        setOthers((current) => ({
          ...current,
          [payload.id]: mergeRemoteUser(current[payload.id], payload),
        }));
      })
      .on("broadcast", { event: "chat_draft" }, ({ payload }) => {
        if (payload.id === identityRef.current.id) return;
        if (!watchingPeersRef.current[payload.id]) return;
        if (modeRef.current !== "cursor") return;
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
        if (!watchingPeersRef.current[payload.id] && modeRef.current === "cursor") return;

        const threadMessage = createThreadMessage({
          id: payload.messageId,
          senderId: payload.id,
          name: payload.name,
          color: payload.color,
          text: payload.message,
          createdAt: payload.createdAt,
        });

        setMessages((current) => appendChatMessage(current, threadMessage));

        if (modeRef.current === "thread") {
          return;
        }

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

    const leavePresence = () => {
      void channel.untrack();
    };

    window.addEventListener("pagehide", leavePresence);

    return () => {
      window.removeEventListener("pagehide", leavePresence);
      setConnected(false);
      watchingPeersRef.current = {};
      setWatchingPeers({});
      channelRef.current = null;
      leavePresence();
      supabase.removeChannel(channel);
    };
  }, [channelName, color, displayName, mode, sessionId]);

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
    if (!connected || !isWide) return undefined;

    const onMove = (event) => {
      updatePosition(event.clientX, event.clientY);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [connected, isWide, updatePosition]);

  useEffect(() => {
    if (!connected || !isWide) return undefined;

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
  }, [connected, isWide, updatePosition]);

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

      if (modeRef.current === "thread") {
        const createdAt = Date.now();
        const messageId = `${sessionId}-${createdAt}`;
        setMessages((current) =>
          appendChatMessage(
            current,
            createThreadMessage({
              id: messageId,
              senderId: sessionId,
              name: displayName,
              color,
              text: trimmed,
              createdAt,
            }),
          ),
        );
        broadcast("chat", { message: trimmed, messageId, createdAt });
        return;
      }

      const createdAt = Date.now();
      const messageId = `${sessionId}-${createdAt}`;
      setMessages((current) =>
        appendChatMessage(
          current,
          createThreadMessage({
            id: messageId,
            senderId: sessionId,
            name: displayName,
            color,
            text: trimmed,
            createdAt,
          }),
        ),
      );
      broadcast("chat_draft", { message: "", x, y });
      setLocalChat(createLocalChat(trimmed, x, y));
      broadcast("chat", { message: trimmed, messageId, createdAt, x, y });
    },
    [broadcast, color, displayName, getPosition, sessionId],
  );

  const setThreadDraft = useCallback(
    (value) => {
      const next = value.slice(0, MAX_CHAT_LENGTH);
      setDraft(next);
      draftRef.current = next;
      if (modeRef.current === "cursor") {
        broadcastDraft(next);
      }
    },
    [broadcastDraft],
  );

  useEffect(() => {
    if (!connected) return undefined;

    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target) && !isChatInput(event.target)) return;

      const input = chatInputRef.current;
      if (!input || input.disabled) return;

      if (event.key === "Enter") {
        if (!isChatInput(event.target)) {
          event.preventDefault();
          input.focus({ preventScroll: true });
          sendChat(draftRef.current);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setDraft("");
        draftRef.current = "";
        if (modeRef.current === "cursor") {
          const { x, y } = getPosition();
          broadcast("chat_draft", { message: "", x, y });
        }
        return;
      }

      if (isChatInput(event.target)) return;

      event.preventDefault();
      input.focus({ preventScroll: true });

      if (event.key === "Backspace") {
        setThreadDraft(draftRef.current.slice(0, -1));
        return;
      }

      if (event.key.length !== 1) return;

      if (draftRef.current.length >= MAX_CHAT_LENGTH) return;
      setThreadDraft(draftRef.current + event.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [broadcast, connected, getPosition, sendChat, setThreadDraft]);

  useEffect(() => {
    if (mode === "thread") return undefined;

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
  }, [mode]);

  return useMemo(
    () => ({
      others: Object.values(others),
      watchingPeers: Object.values(watchingPeers),
      localChat,
      messages,
      draft,
      cursor,
      connected,
      isWide,
      chatInputRef,
      setThreadDraft,
      sendChat,
      self: { id: sessionId, name: displayName, color, mode },
    }),
    [
      others,
      watchingPeers,
      localChat,
      messages,
      draft,
      cursor,
      connected,
      isWide,
      setThreadDraft,
      sendChat,
      sessionId,
      displayName,
      color,
      mode,
    ],
  );
}
