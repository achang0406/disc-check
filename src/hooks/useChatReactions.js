import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyReactionDelta,
  fetchGroupChatReactions,
  pruneReactionsForMessages,
  toggleGroupChatReaction,
} from "../lib/chatReactions.js";
import { isSupabaseConfigured } from "../lib/supabase.js";

function messageIdsKey(messages) {
  return messages.map((message) => message.id).join("\u0001");
}

export function useChatReactions({ groupId, messages, sessionId }) {
  const [reactionsByMessageId, setReactionsByMessageId] = useState({});
  const reactionsRef = useRef(reactionsByMessageId);
  const messageIdsRef = useRef("");

  useEffect(() => {
    reactionsRef.current = reactionsByMessageId;
  }, [reactionsByMessageId]);

  useEffect(() => {
    if (!groupId) {
      setReactionsByMessageId({});
      messageIdsRef.current = "";
      return;
    }

    setReactionsByMessageId({});
    messageIdsRef.current = "";
  }, [groupId]);

  const refetchReactions = useCallback(async (messageList) => {
    if (!groupId || !messageList.length) {
      setReactionsByMessageId({});
      return;
    }

    const ids = messageList.map((message) => message.id);
    const map = await fetchGroupChatReactions(groupId, ids);
    setReactionsByMessageId(map);
  }, [groupId]);

  useEffect(() => {
    if (!groupId || messages.length === 0) {
      if (messages.length === 0) {
        setReactionsByMessageId({});
        messageIdsRef.current = "";
      }
      return;
    }

    const nextKey = messageIdsKey(messages);
    if (nextKey === messageIdsRef.current) return;

    messageIdsRef.current = nextKey;
    void refetchReactions(messages);
  }, [groupId, messages, refetchReactions]);

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured()) return undefined;

    const onVisible = () => {
      if (document.visibilityState !== "visible" || messages.length === 0) return;
      void refetchReactions(messages);
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [groupId, messages, refetchReactions]);

  const handleReactionEvent = useCallback((eventType, row) => {
    setReactionsByMessageId((current) => applyReactionDelta(current, eventType, row));
  }, []);

  const handleMessageDelete = useCallback((messageId) => {
    setReactionsByMessageId((current) => {
      if (!current[messageId]) return current;
      const next = { ...current };
      delete next[messageId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const ids = messages.map((message) => message.id);
    setReactionsByMessageId((current) => pruneReactionsForMessages(current, ids));
  }, [messages]);

  const toggleReaction = useCallback(
    async (messageId, emoji) => {
      if (!groupId || !sessionId || !messageId) return;

      const snapshot = reactionsRef.current;
      const optimisticRow = {
        message_id: messageId,
        group_id: groupId,
        reactor_id: sessionId,
        emoji,
      };

      const existing = (snapshot[messageId] ?? []).find(
        (entry) => entry.reactorId === sessionId,
      );
      const eventType = existing?.emoji === emoji ? "DELETE" : existing ? "UPDATE" : "INSERT";

      setReactionsByMessageId((current) => applyReactionDelta(current, eventType, optimisticRow));

      const result = await toggleGroupChatReaction({
        groupId,
        messageId,
        reactorId: sessionId,
        emoji,
      });

      if (!result.ok) {
        setReactionsByMessageId(snapshot);
        return;
      }

      if (result.row) {
        setReactionsByMessageId((current) =>
          applyReactionDelta(current, result.event, result.row),
        );
      }
    },
    [groupId, sessionId],
  );

  return useMemo(
    () => ({
      reactionsByMessageId,
      toggleReaction,
      handleReactionEvent,
      handleMessageDelete,
    }),
    [reactionsByMessageId, toggleReaction, handleReactionEvent, handleMessageDelete],
  );
}
