import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { OutboxRow } from "./pushMaterialize.ts";

export const CHATTER_WINDOW_MS = 30 * 60 * 1000;
export const CHATTER_COOLDOWN_MS = 60 * 60 * 1000;

export type WindowSenderEntry = {
  sender_id?: string;
  at?: string;
};

/** Re-prune by time at drain — distinct_sender_count can lag if no new messages ran the trigger. */
export function countActiveWindowSenders(
  windowSenders: WindowSenderEntry[] | null | undefined,
  now = new Date(),
): number {
  const cutoff = now.getTime() - CHATTER_WINDOW_MS;
  const active = new Set<string>();

  for (const entry of windowSenders ?? []) {
    const senderId = typeof entry?.sender_id === "string" ? entry.sender_id : "";
    const atMs = entry?.at ? Date.parse(entry.at) : Number.NaN;

    if (!senderId || !Number.isFinite(atMs) || atMs < cutoff) {
      continue;
    }

    active.add(senderId);
  }

  return active.size;
}

export function isStaleChatterRowForWindow(
  windowSenders: WindowSenderEntry[] | null | undefined,
  now = new Date(),
) {
  return countActiveWindowSenders(windowSenders, now) < 2;
}

export async function isStaleChatterOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (row.event_type !== "chat_chatter" || !row.group_id) {
    return false;
  }

  const { data: state, error: stateError } = await supabase
    .from("chat_push_state")
    .select("window_senders, distinct_sender_count")
    .eq("group_id", row.group_id)
    .maybeSingle();

  if (stateError) {
    console.error("chat_chatter stale check failed — chat_push_state", row.id, stateError.message);
    return true;
  }

  if (!state) {
    return true;
  }

  const windowSenders = Array.isArray(state.window_senders)
    ? (state.window_senders as WindowSenderEntry[])
    : [];

  return isStaleChatterRowForWindow(windowSenders);
}
