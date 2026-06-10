import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MAX_CHAT_LENGTH,
  getPresenceChannel,
  getPresenceColor,
  getPresenceName,
  getPresenceSessionId,
  isEditableTarget,
} from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import {
  appendChatMessage,
  fetchGroupChatMessages,
  saveGroupChatMessage,
  subscribeGroupChat,
} from "../lib/chatMessages.js";
import { useChatReactions } from "./useChatReactions.js";
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

function isChatInput(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(".chat-bar__input"));
}

export function usePresence(profile, groupId, groupName = "") {
  const [watchingPeers, setWatchingPeers] = useState({});
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [resumeKey, setResumeKey] = useState(0);

  const channelRef = useRef(null);
  const chatInputRef = useRef(null);
  const connectedRef = useRef(false);
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
  const channelName = getPresenceChannel(groupId);

  const {
    reactionsByMessageId,
    toggleReaction,
    handleReactionEvent,
    handleMessageDelete,
  } = useChatReactions({ groupId, messages, sessionId });

  identityRef.current = { id: sessionId, name: displayName, color };

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    setWatchingPeers({});
    watchingPeersRef.current = {};
    setDraft("");
    draftRef.current = "";

    if (!groupId) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    let cancelled = false;
    setMessages([]);
    setMessagesLoading(true);

    const hydrateMessages = async () => {
      try {
        const stored = await fetchGroupChatMessages(groupId);
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
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured()) return undefined;

    const refreshMessages = async () => {
      const stored = await fetchGroupChatMessages(groupId);
      if (stored.length === 0) return;
      setMessages(stored);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshMessages();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [groupId]);

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState !== "visible") return;
      if (!connectedRef.current) {
        setResumeKey((current) => current + 1);
      }
    };

    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, []);

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured()) return undefined;

    return subscribeGroupChat(groupId, {
      onMessage: (message) => {
        setMessages((current) => appendChatMessage(current, message));
      },
      onMessageDelete: (messageId) => {
        setMessages((current) => current.filter((entry) => entry.id !== messageId));
        handleMessageDelete(messageId);
      },
      onReaction: handleReactionEvent,
    });
  }, [groupId, handleMessageDelete, handleReactionEvent]);

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
  }, [channelName, color, displayName, resumeKey, sessionId]);

  useEffect(() => {
    if (!connected || !channelRef.current) return;

    channelRef.current.track({
      id: sessionId,
      name: displayName,
      color,
    });
  }, [color, connected, displayName, sessionId]);

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

      if (!groupId) return;

      void saveGroupChatMessage({
        groupId,
        id: messageId,
        senderId: sessionId,
        senderName: displayName,
        senderColor: color,
        text: trimmed,
        createdAt,
      });
    },
    [color, displayName, groupId, sessionId],
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
    setDraft(value.slice(0, MAX_CHAT_LENGTH));
    draftRef.current = value.slice(0, MAX_CHAT_LENGTH);
  }, []);

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
  }, [connected, sendChat, setThreadDraft]);

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
      reactionsByMessageId,
      toggleReaction,
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
      reactionsByMessageId,
      toggleReaction,
      sessionId,
      displayName,
      color,
    ],
  );
}
