import { CHAT_REACTION_EMOJI_SET } from "../constants/chatReactions.js";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export { CHAT_REACTION_EMOJIS, CHAT_TAPBACK_EMOJIS, CHAT_EXTRA_EMOJIS } from "../constants/chatReactions.js";

function rowToReaction(row) {
  if (!row || typeof row !== "object") return null;

  const messageId = typeof row.message_id === "string" ? row.message_id : null;
  const groupId = typeof row.group_id === "string" ? row.group_id : null;
  const reactorId = typeof row.reactor_id === "string" ? row.reactor_id : null;
  const emoji = typeof row.emoji === "string" ? row.emoji : null;
  const createdAt = row.created_at ? Date.parse(row.created_at) : 0;

  if (!messageId || !groupId || !reactorId || !emoji || !CHAT_REACTION_EMOJI_SET.has(emoji)) {
    return null;
  }

  return { messageId, groupId, reactorId, emoji, createdAt };
}

function sortReactions(entries) {
  return [...entries].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }
    return left.reactorId.localeCompare(right.reactorId);
  });
}

function upsertReaction(entries, { reactorId, emoji, createdAt = Date.now() }) {
  const withoutReactor = entries.filter((entry) => entry.reactorId !== reactorId);
  return sortReactions([...withoutReactor, { reactorId, emoji, createdAt }]);
}

function removeReactor(entries, reactorId) {
  return entries.filter((entry) => entry.reactorId !== reactorId);
}

export function buildReactionsMap(rows) {
  const map = {};

  for (const row of rows ?? []) {
    const reaction = rowToReaction(row);
    if (!reaction) continue;

    const current = map[reaction.messageId] ?? [];
    map[reaction.messageId] = upsertReaction(current, {
      reactorId: reaction.reactorId,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt,
    });
  }

  return map;
}

export function applyReactionDelta(map, event, row) {
  const reaction = rowToReaction(row);
  if (!reaction) return map;

  const next = { ...map };
  const current = [...(next[reaction.messageId] ?? [])];

  if (event === "DELETE") {
    const updated = removeReactor(current, reaction.reactorId);
    if (updated.length === 0) {
      delete next[reaction.messageId];
    } else {
      next[reaction.messageId] = updated;
    }
    return next;
  }

  next[reaction.messageId] = upsertReaction(current, {
    reactorId: reaction.reactorId,
    emoji: reaction.emoji,
    createdAt: reaction.createdAt || Date.now(),
  });
  return next;
}

export function pruneReactionsForMessages(map, messageIds) {
  const allowed = new Set(messageIds);
  const next = {};

  for (const [messageId, reactions] of Object.entries(map)) {
    if (allowed.has(messageId)) {
      next[messageId] = reactions;
    }
  }

  return next;
}

export async function fetchGroupChatReactions(groupId, messageIds) {
  if (!isSupabaseConfigured() || !groupId || !messageIds?.length) {
    return {};
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("group_chat_message_reactions")
    .select("message_id, group_id, reactor_id, emoji, created_at")
    .eq("group_id", groupId)
    .in("message_id", messageIds);

  if (error) {
    console.warn("Failed to load chat reactions", error.message ?? error);
    return {};
  }

  return buildReactionsMap(data ?? []);
}

export async function toggleGroupChatReaction({
  groupId,
  messageId,
  reactorId,
  emoji,
}) {
  if (
    !isSupabaseConfigured() ||
    !groupId ||
    !messageId ||
    !reactorId ||
    !CHAT_REACTION_EMOJI_SET.has(emoji)
  ) {
    return { ok: false, event: null };
  }

  const supabase = getSupabase();
  const { data: existing, error: readError } = await supabase
    .from("group_chat_message_reactions")
    .select("message_id, group_id, reactor_id, emoji")
    .eq("message_id", messageId)
    .eq("reactor_id", reactorId)
    .maybeSingle();

  if (readError) {
    console.warn("Failed to read chat reaction", readError.message ?? readError);
    return { ok: false, event: null };
  }

  if (existing?.emoji === emoji) {
    const { error: deleteError } = await supabase
      .from("group_chat_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("reactor_id", reactorId);

    if (deleteError) {
      console.warn("Failed to remove chat reaction", deleteError.message ?? deleteError);
      return { ok: false, event: null };
    }

    return { ok: true, event: "DELETE", row: existing };
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("group_chat_message_reactions")
    .upsert(
      {
        message_id: messageId,
        group_id: groupId,
        reactor_id: reactorId,
        emoji,
      },
      { onConflict: "message_id,reactor_id" },
    )
    .select("message_id, group_id, reactor_id, emoji")
    .single();

  if (upsertError) {
    console.warn("Failed to save chat reaction", upsertError.message ?? upsertError);
    return { ok: false, event: null };
  }

  return {
    ok: true,
    event: existing ? "UPDATE" : "INSERT",
    row: upserted,
  };
}
