/**
 * Chat message reactions — toggle, group_id trigger, CASCADE, canonical emojis.
 *
 * Usage: npm run verify:chat-reactions
 * Optional: VERIFY_GROUP_ID=grp_xxx npm run verify:chat-reactions
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { CHAT_REACTION_EMOJIS } from "../src/constants/chatReactions.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runId = Date.now().toString(36);
const reactorId = `verify-reactions-${runId}`;
const wrongGroupId = "grp_verify_wrong_group";

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) {
    throw new Error(typeof message === "function" ? message() : message);
  }
}

async function resolveGroupId() {
  const envGroup = process.env.VERIFY_GROUP_ID?.trim();
  if (envGroup) return envGroup;

  const { data, error } = await supabase.from("groups").select("id").limit(1).maybeSingle();
  if (error) throw new Error(`groups read: ${error.message}`);
  assert(data?.id, "no group found — set VERIFY_GROUP_ID");
  return data.id;
}

async function insertMessage(groupId, messageId, text) {
  const { error } = await supabase.from("group_chat_messages").insert({
    id: messageId,
    group_id: groupId,
    sender_id: reactorId,
    sender_name: "verify-reactions",
    sender_color: "#336699",
    text,
    created_at: new Date().toISOString(),
  });
  if (error && error.code !== "23505") {
    throw new Error(`insert message failed: ${error.message}`);
  }
}

async function cleanup(groupId, messageId) {
  await supabase.from("group_chat_messages").delete().eq("id", messageId);
  await supabase
    .from("group_chat_messages")
    .delete()
    .eq("group_id", groupId)
    .like("id", `verify-reactions-${runId}%`);
}

async function main() {
  const groupId = await resolveGroupId();
  const messageId = `verify-reactions-${runId}-msg`;

  console.log(`verify:chat-reactions group=${groupId} message=${messageId}`);

  try {
    await insertMessage(groupId, messageId, "reaction verify");

    for (const emoji of CHAT_REACTION_EMOJIS) {
      const { error } = await supabase.from("group_chat_message_reactions").upsert(
        {
          message_id: messageId,
          group_id: groupId,
          reactor_id: `${reactorId}-${emoji}`,
          emoji,
        },
        { onConflict: "message_id,reactor_id" },
      );
      assert(!error, () => `emoji ${emoji} insert failed: ${error?.message ?? error}`);
    }

    const { error: wrongGroupError } = await supabase
      .from("group_chat_message_reactions")
      .upsert(
        {
          message_id: messageId,
          group_id: wrongGroupId,
          reactor_id: `${reactorId}-trigger`,
          emoji: CHAT_REACTION_EMOJIS[0],
        },
        { onConflict: "message_id,reactor_id" },
      );
    assert(!wrongGroupError, () => `trigger upsert failed: ${wrongGroupError?.message ?? wrongGroupError}`);

    const { data: triggerRow, error: triggerReadError } = await supabase
      .from("group_chat_message_reactions")
      .select("group_id, emoji")
      .eq("message_id", messageId)
      .eq("reactor_id", `${reactorId}-trigger`)
      .maybeSingle();
    assert(!triggerReadError, () => `trigger read failed: ${triggerReadError?.message ?? triggerReadError}`);
    assert(triggerRow?.group_id === groupId, `group_id trigger: expected ${groupId}, got ${triggerRow?.group_id}`);

    const { error: toggleInsertError } = await supabase
      .from("group_chat_message_reactions")
      .upsert(
        {
          message_id: messageId,
          group_id: groupId,
          reactor_id: reactorId,
          emoji: "👍",
        },
        { onConflict: "message_id,reactor_id" },
      );
    assert(!toggleInsertError, () => `toggle insert failed: ${toggleInsertError?.message ?? toggleInsertError}`);

    const { error: toggleOffError } = await supabase
      .from("group_chat_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("reactor_id", reactorId);
    assert(!toggleOffError, () => `toggle off failed: ${toggleOffError?.message ?? toggleOffError}`);

    const { data: afterToggleOff } = await supabase
      .from("group_chat_message_reactions")
      .select("reactor_id")
      .eq("message_id", messageId)
      .eq("reactor_id", reactorId)
      .maybeSingle();
    assert(!afterToggleOff, "toggle off should delete row");

    const { error: replaceError } = await supabase
      .from("group_chat_message_reactions")
      .upsert(
        {
          message_id: messageId,
          group_id: groupId,
          reactor_id: reactorId,
          emoji: "👍",
        },
        { onConflict: "message_id,reactor_id" },
      );
    assert(!replaceError, () => `replace insert failed: ${replaceError?.message ?? replaceError}`);

    const { error: replaceUpdateError } = await supabase
      .from("group_chat_message_reactions")
      .upsert(
        {
          message_id: messageId,
          group_id: groupId,
          reactor_id: reactorId,
          emoji: "🔥",
        },
        { onConflict: "message_id,reactor_id" },
      );
    assert(!replaceUpdateError, () => `replace update failed: ${replaceUpdateError?.message ?? replaceUpdateError}`);

    const { data: replaceRows, error: replaceReadError } = await supabase
      .from("group_chat_message_reactions")
      .select("emoji")
      .eq("message_id", messageId)
      .eq("reactor_id", reactorId);
    assert(!replaceReadError, () => `replace read failed: ${replaceReadError?.message ?? replaceReadError}`);
    assert(replaceRows?.length === 1, "expected single reaction row per reactor");
    assert(replaceRows[0].emoji === "🔥", `replace emoji: expected 🔥, got ${replaceRows[0].emoji}`);

    const { count: reactionCountBefore } = await supabase
      .from("group_chat_message_reactions")
      .select("message_id", { count: "exact", head: true })
      .eq("message_id", messageId);
    assert((reactionCountBefore ?? 0) > 0, "expected reactions before message delete");

    const { error: deleteMessageError } = await supabase
      .from("group_chat_messages")
      .delete()
      .eq("id", messageId);
    assert(!deleteMessageError, () => `delete message failed: ${deleteMessageError?.message ?? deleteMessageError}`);

    const { count: reactionCountAfter } = await supabase
      .from("group_chat_message_reactions")
      .select("message_id", { count: "exact", head: true })
      .eq("message_id", messageId);
    assert(reactionCountAfter === 0, "CASCADE should remove reactions");

    console.log("verify:chat-reactions passed");
  } finally {
    await cleanup(groupId, messageId);
  }
}

main().catch((error) => {
  console.error("verify:chat-reactions failed:", error.message ?? error);
  process.exit(1);
});
