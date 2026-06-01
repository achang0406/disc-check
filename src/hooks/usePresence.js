import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_CHAT_LENGTH,
  getPresenceChannel,
  getPresenceColor,
  getPresenceName,
  getPresenceSessionId,
} from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import {
  appendChatMessage,
  fetchGameChatMessages,
  saveGameChatMessage,
  subscribeGameChatMessages,
} from "../lib/chatMessages.js";
import { notifyChatPush } from "../lib/push.js";

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

export function usePresence(profile, gameId, gameName = "") {
  const [watchingPeers, setWatchingPeers] = useState({});
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);

  const channelRef = useRef(null);
  const chatInputRef = useRef(null);
  const draftRef = useRef("");
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

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setWatchingPeers({});
    watchingPeersRef.current = {};
    setDraft("");
    draftRef.current = "";

    if (!gameId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    let cancelled = false;
    setMessages([]);
    setMessagesLoading(true);

    const hydrateMessages = async () => {
      try {
        const stored = await fetchGameChatMessages(gameId);
        if (!cancelled) {
          setMessages(stored);
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    };

    void hydrateMessages();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured()) return undefined;

    const refreshMessages = async () => {
      const stored = await fetchGameChatMessages(gameId);
      if (stored.length === 0) return;
      setMessages(stored);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshMessages();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured()) return undefined;

    return subscribeGameChatMessages(gameId, (message) => {
      setMessages((current) => appendChatMessage(current, message));
    });
  }, [gameId]);

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
    };

    channel
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (payload.id === identityRef.current.id) return;

        const threadMessage = createThreadMessage({
          id: payload.messageId,
          senderId: payload.id,
          name: payload.name,
          color: payload.color,
          text: payload.message,
          createdAt: payload.createdAt,
        });

        setMessages((current) => appendChatMessage(current, threadMessage));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await channel.track({
            id: sessionId,
            name: displayName,
            color,
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
  }, [channelName, color, displayName, sessionId]);

  useEffect(() => {
    if (!connected || !channelRef.current) return;

    channelRef.current.track({
      id: sessionId,
      name: displayName,
      color,
    });
  }, [color, connected, displayName, sessionId]);

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

  const deliverChatMessage = useCallback(
    async (trimmed) => {
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

      if (!gameId) return;

      void saveGameChatMessage({
        gameId,
        id: messageId,
        senderId: sessionId,
        senderName: displayName,
        senderColor: color,
        text: trimmed,
        createdAt,
      });

      void notifyChatPush({
        gameId,
        senderId: sessionId,
        senderName: displayName,
        senderColor: color,
        text: trimmed,
        messageId,
        gameName,
        createdAt,
      });
    },
    [broadcast, color, displayName, gameId, gameName, sessionId],
  );

  const sendChat = useCallback(
    (message) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      setDraft("");
      draftRef.current = "";
      void deliverChatMessage(trimmed);
    },
    [deliverChatMessage],
  );

  const setThreadDraft = useCallback((value) => {
    const next = value.slice(0, MAX_CHAT_LENGTH);
    setDraft(next);
    draftRef.current = next;
  }, []);

  return useMemo(
    () => ({
      watchingPeers: Object.values(watchingPeers),
      messages,
      messagesLoading,
      draft,
      connected,
      chatInputRef,
      setThreadDraft,
      sendChat,
      self: { id: sessionId, name: displayName, color },
    }),
    [
      watchingPeers,
      messages,
      messagesLoading,
      draft,
      connected,
      setThreadDraft,
      sendChat,
      sessionId,
      displayName,
      color,
    ],
  );
}
