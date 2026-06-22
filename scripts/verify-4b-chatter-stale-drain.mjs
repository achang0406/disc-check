/**
 * Phase 4b prep — chat_chatter drain skips when window has died down.
 *
 * Inserts a synthetic chat_chatter outbox row with expired window_senders,
 * drains process-push-outbox, asserts row skipped without send.
 *
 * Usage: npm run verify:4b-chatter-stale-drain
 * Optional: VERIFY_GAME_ID=g_1baf4461 npm run verify:4b-chatter-stale-drain
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gameId = process.env.VERIFY_GAME_ID?.trim() || "g_1baf4461";

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  const staleAt = new Date(Date.now() - 35 * 60 * 1000).toISOString();

  const { data: savedState, error: savedError } = await supabase
    .from("chat_push_state")
    .select("*")
    .eq("group_id", groupId)
    .maybeSingle();
  if (savedError) throw new Error(savedError.message);

  const expiredWindow = {
    group_id: groupId,
    window_senders: [
      { sender_id: "verify-stale-a", at: staleAt },
      { sender_id: "verify-stale-b", at: staleAt },
    ],
    distinct_sender_count: 2,
    last_push_at: null,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("chat_push_state").upsert(expiredWindow);

  const { data: outboxRow, error: insertError } = await supabase
    .from("push_outbox")
    .insert({
      group_id: groupId,
      game_id: null,
      event_type: "chat_chatter",
      payload: null,
      exclude_subscriber_ids: ["verify-stale-a"],
    })
    .select("id")
    .single();
  if (insertError) throw new Error(`insert outbox: ${insertError.message}`);

  try {
    const drain = await drainOutbox();
    assert(drain.skipped >= 1, "expected stale chat_chatter skip");

    const { data: row, error: rowError } = await supabase
      .from("push_outbox")
      .select("processed_at")
      .eq("id", outboxRow.id)
      .maybeSingle();
    if (rowError) throw new Error(rowError.message);
    assert(row?.processed_at, "stale chat_chatter row should be processed after drain");

    console.log("OK — chat_chatter skipped when 30m window expired (died down)");
  } finally {
    await supabase.from("push_outbox").delete().eq("id", outboxRow.id);

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
