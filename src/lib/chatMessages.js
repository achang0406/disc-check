import { CHAT_CACHE_MAX_MESSAGES, MAX_CHAT_LENGTH } from "../constants/presence.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

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

export async function fetchGameChatMessages(gameId, limit = CHAT_CACHE_MAX_MESSAGES) {
  if (!isSupabaseConfigured() || !gameId) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("game_chat_messages")
    .select("id, game_id, sender_id, sender_name, sender_color, text, created_at")
    .eq("game_id", gameId)
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

export async function saveGameChatMessage({
  gameId,
  id,
  senderId,
  senderName,
  senderColor,
  text,
  createdAt,
}) {
  if (!isSupabaseConfigured() || !gameId || !id || !senderId || !text) {
    return false;
  }

  const supabase = getSupabase();
  const { error } = await supabase.from("game_chat_messages").insert({
    id,
    game_id: gameId,
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

export function subscribeGameChatMessages(gameId, onMessage) {
  if (!isSupabaseConfigured() || !gameId) {
    return () => {};
  }

  const supabase = getSupabase();
  const channel = supabase
    .channel(`game-chat-messages:${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_chat_messages",
        filter: `game_id=eq.${gameId}`,
      },
      (payload) => {
        const message = rowToMessage(payload.new);
        if (message) onMessage(message);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
