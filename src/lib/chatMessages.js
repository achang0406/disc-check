import { CHAT_CACHE_MAX_MESSAGES, MAX_CHAT_LENGTH } from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

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

function rowToMessage(row) {
  if (!row || typeof row !== "object") return null;

  const id = typeof row.id === "string" ? row.id : null;
  const senderId = typeof row.sender_id === "string" ? row.sender_id : null;
  const name = typeof row.sender_name === "string" ? row.sender_name : null;
  const color = typeof row.sender_color === "string" ? row.sender_color : null;
  const text = typeof row.text === "string" ? row.text : null;
  const createdAt = row.created_at ? Date.parse(row.created_at) : Number.NaN;

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

export async function fetchGroupChatMessages(groupId, limit = CHAT_CACHE_MAX_MESSAGES) {
  if (!isSupabaseConfigured() || !groupId) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("group_chat_messages")
    .select("id, group_id, sender_id, sender_name, sender_color, text, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Failed to load chat messages", error.message ?? error);
    return [];
  }

  return (data ?? [])
    .map(rowToMessage)
    .filter(Boolean)
    .reverse();
}

export async function saveGroupChatMessage({
  groupId,
  id,
  senderId,
  senderName,
  senderColor,
  text,
  createdAt,
}) {
  if (!isSupabaseConfigured() || !groupId || !id || !senderId || !text) {
    return false;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("group_chat_messages").insert({
    id,
    group_id: groupId,
    sender_id: senderId,
    sender_name: senderName,
    sender_color: senderColor,
    text: text.slice(0, MAX_CHAT_LENGTH),
    created_at: new Date(createdAt).toISOString(),
  });

  if (error && error.code !== "23505") {
    console.warn("Failed to save chat message", error.message ?? error);
    return false;
  }

  return true;
}

export function subscribeGroupChat(
  groupId,
  { onMessage, onMessageDelete, onReaction } = {},
) {
  if (!isSupabaseConfigured() || !groupId) {
    return () => {};
  }

  const supabase = getSupabase();
  let channel = supabase.channel(`group-chat:${groupId}`);

  if (onMessage) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "group_chat_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        const message = rowToMessage(payload.new);
        if (message) onMessage(message);
      },
    );
  }

  if (onMessageDelete) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "group_chat_messages",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => {
        const id = payload.old?.id;
        if (typeof id === "string") onMessageDelete(id);
      },
    );
  }

  if (onReaction) {
    const handleReaction = (eventType) => (payload) => {
      const row = eventType === "DELETE" ? payload.old : payload.new;
      onReaction(eventType, row);
    };

    channel = channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_chat_message_reactions",
          filter: `group_id=eq.${groupId}`,
        },
        handleReaction("INSERT"),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_chat_message_reactions",
          filter: `group_id=eq.${groupId}`,
        },
        handleReaction("UPDATE"),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_chat_message_reactions",
          filter: `group_id=eq.${groupId}`,
        },
        handleReaction("DELETE"),
      );
  }

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeGroupChatMessages(groupId, onMessage) {
  return subscribeGroupChat(groupId, { onMessage });
}
