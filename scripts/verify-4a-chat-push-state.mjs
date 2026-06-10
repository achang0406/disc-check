/**
 * Phase 4a — chat_push_state window maintenance (mono sender never enqueues).
 *
 * Usage: npm run verify:4a-chat-push-state
 * Optional: VERIFY_GAME_ID=g_1baf4461 VERIFY_GROUP_ID=grp_xxx npm run verify:4a-chat-push-state
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameId = process.env.VERIFY_GAME_ID?.trim() || "g_1baf4461";
const senderA = "verify-4a-sender-a";
const senderB = "verify-4a-sender-b";
const runId = Date.now().toString(36);

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function messageId(senderId, index) {
  return `verify-4a-${runId}-${senderId}-${index}`;
}

async function fetchState(groupId) {
  const { data, error } = await supabase
    .from("chat_push_state")
    .select("group_id, window_senders, distinct_sender_count, last_push_at, updated_at")
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw new Error(`chat_push_state read: ${error.message}`);
  return data;
}

async function insertMessage(groupId, senderId, index, text) {
  const started = performance.now();
  const { error } = await supabase.from("group_chat_messages").insert({
    id: messageId(senderId, index),
    group_id: groupId,
    sender_id: senderId,
    sender_name: senderId,
    sender_color: "#336699",
    text,
    created_at: new Date().toISOString(),
  });
  const elapsedMs = performance.now() - started;
  if (error && error.code !== "23505") {
    throw new Error(`insert message failed: ${error.message}`);
  }
  return elapsedMs;
}

async function assertNoChatterOutbox(groupId) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, event_type")
    .eq("group_id", groupId)
    .eq("event_type", "chat_chatter")
    .is("processed_at", null);
  if (error) throw new Error(`push_outbox read: ${error.message}`);
  assert((data ?? []).length === 0, "expected no pending chat_chatter outbox rows");
}

async function cleanupMessages(groupId) {
  await supabase
    .from("group_chat_messages")
    .delete()
    .eq("group_id", groupId)
    .like("id", `verify-4a-${runId}%`);
}

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game?.group_id, `game not found or missing group_id: ${gameId}`);

  const groupId = process.env.VERIFY_GROUP_ID?.trim() || game.group_id;

  const savedState = await fetchState(groupId);

  await supabase.from("chat_push_state").delete().eq("group_id", groupId);
  await supabase
    .from("push_outbox")
    .delete()
    .eq("group_id", groupId)
    .eq("event_type", "chat_chatter")
    .is("processed_at", null);

  try {
    const t1 = await insertMessage(groupId, senderA, 1, "verify mono 1");
    await insertMessage(groupId, senderA, 2, "verify mono 2");
    await insertMessage(groupId, senderA, 3, "verify mono 3");

    let state = await fetchState(groupId);
    assert(state, "expected chat_push_state row after inserts");
    assert(state.distinct_sender_count === 1, `mono sender expected 1, got ${state.distinct_sender_count}`);
    await assertNoChatterOutbox(groupId);

    await insertMessage(groupId, senderB, 1, "verify duo 1");
    state = await fetchState(groupId);
    assert(state.distinct_sender_count === 2, `two senders expected 2, got ${state.distinct_sender_count}`);

    console.log(`latency sample (first insert): ${Math.round(t1)}ms`);

    const staleAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const { error: backdateError } = await supabase
      .from("chat_push_state")
      .update({
        window_senders: [
          { sender_id: senderA, at: staleAt },
          { sender_id: senderB, at: new Date().toISOString() },
        ],
        distinct_sender_count: 2,
      })
      .eq("group_id", groupId);
    if (backdateError) throw new Error(`backdate window_senders: ${backdateError.message}`);

    await insertMessage(groupId, senderB, 2, "verify prune");
    state = await fetchState(groupId);
    assert(state.distinct_sender_count === 1, `after prune expected 1, got ${state.distinct_sender_count}`);

    const senderIds = (state.window_senders ?? []).map((entry) => entry.sender_id);
    assert(!senderIds.includes(senderA), "stale sender A should be pruned");
    assert(senderIds.includes(senderB), "sender B should remain in window");

    console.log(`OK — chat_push_state for group ${groupId} (${game.name})`);
  } finally {
    await cleanupMessages(groupId);
    await supabase
      .from("push_outbox")
      .delete()
      .eq("group_id", groupId)
      .eq("event_type", "chat_chatter")
      .is("processed_at", null);

    if (savedState) {
      await supabase.from("chat_push_state").upsert(savedState);
    } else {
      await supabase.from("chat_push_state").delete().eq("group_id", groupId);
    }
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
