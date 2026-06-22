/**
 * Phase 4b — chatter enqueue on 2+ senders, cooldown, drain delivery path.
 *
 * Usage: npm run verify:4b-chat-chatter
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:4b-chat-chatter
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameId = process.env.VERIFY_GAME_ID?.trim() || "g_1baf4461";
const senderA = "verify-4b-sender-a";
const senderB = "verify-4b-sender-b";
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
  return `verify-4b-${runId}-${senderId}-${index}`;
}

async function pendingChatterRows(groupId) {
  const { data, error } = await supabase
    .from("push_outbox")
    .select("id, exclude_subscriber_ids")
    .eq("group_id", groupId)
    .eq("event_type", "chat_chatter")
    .is("processed_at", null);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function insertMessage(groupId, senderId, index, text) {
  const { error } = await supabase.from("group_chat_messages").insert({
    id: messageId(senderId, index),
    group_id: groupId,
    sender_id: senderId,
    sender_name: senderId,
    sender_color: "#336699",
    text,
    created_at: new Date().toISOString(),
  });
  if (error && error.code !== "23505") {
    throw new Error(`insert message: ${error.message}`);
  }
}

async function fetchState(groupId) {
  const { data, error } = await supabase
    .from("chat_push_state")
    .select("distinct_sender_count, last_push_at")
    .eq("group_id", groupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function cleanupMessages(groupId) {
  await supabase
    .from("group_chat_messages")
    .delete()
    .eq("group_id", groupId)
    .like("id", `verify-4b-${runId}%`);

  await supabase
    .from("push_outbox")
    .delete()
    .eq("group_id", groupId)
    .eq("event_type", "chat_chatter")
    .is("processed_at", null);
}

async function drainOutbox() {
  const response = await fetch(`${url}/functions/v1/pickup-frisbee-process-push-outbox`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const body = await response.json();
  console.log("drain response:", JSON.stringify(body));
  assert(response.ok, `drain failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, group_id")
    .eq("id", gameId)
    .maybeSingle();
  if (gameError) throw new Error(gameError.message);
  assert(game?.group_id, `game not found: ${gameId}`);

  const groupId = game.group_id;

  const { data: savedState } = await supabase
    .from("chat_push_state")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();

  await supabase.from("chat_push_state").delete().eq("group_id", groupId);
  await supabase
    .from("push_outbox")
    .delete()
    .eq("group_id", groupId)
    .eq("event_type", "chat_chatter")
    .is("processed_at", null);

  try {
    await insertMessage(groupId, senderA, 1, "solo");
    let state = await fetchState(groupId);
    assert(state?.distinct_sender_count === 1, "mono sender count");
    assert((await pendingChatterRows(groupId)).length === 0, "mono sender no outbox");

    await insertMessage(groupId, senderB, 1, "duo");
    state = await fetchState(groupId);
    assert(state?.distinct_sender_count === 2, "two senders count");
    assert(state?.last_push_at, "last_push_at set on enqueue");

    const pending = await pendingChatterRows(groupId);
    assert(pending.length === 1, `expected one pending row, got ${pending.length}`);
    assert(
      pending[0].exclude_subscriber_ids?.includes(senderB),
      "exclude triggering sender B",
    );

    await insertMessage(groupId, senderA, 2, "cooldown");
    const pendingAfter = await pendingChatterRows(groupId);
    assert(pendingAfter.length === 1, "cooldown blocks second enqueue");

    const rowId = pending[0].id;
    const drain = await drainOutbox();
    assert(drain.processed >= 1, "drain processed chatter row");

    const { data: processedRow } = await supabase
      .from("push_outbox")
      .select("processed_at")
      .eq("id", rowId)
      .maybeSingle();
    assert(processedRow?.processed_at, "outbox row marked processed");

    console.log(`OK — chatter enqueue for ${game.name} (${groupId})`);
  } finally {
    await cleanupMessages(groupId);

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
