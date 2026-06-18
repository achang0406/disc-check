import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  isCheckinBadgeEventType,
  isRsvpBadgeEventType,
  isStaleCheckinOutboxRow,
  isStaleRsvpOutboxRow,
  winningCheckinBadgeRowIds,
  winningRsvpBadgeRowIds,
} from "../_shared/badgePush.ts";
import { isStaleChatterOutboxRow } from "../_shared/chatterPush.ts";
import {
  isStaleCancelledOutboxRow,
  isStalePhaseLiveOutboxRow,
} from "../_shared/lifecyclePush.ts";
import { materializePushPayload, type OutboxRow } from "../_shared/pushMaterialize.ts";
import { isPushConfigured, sendPush } from "../_shared/pushSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 50;
const MAX_DELIVERY_ATTEMPTS = 12;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}


async function resolveCycleAt(
  supabase: SupabaseClient,
  gameId: string | null,
  cache: Map<string, string | null>,
) {
  if (!gameId) return null;
  if (cache.has(gameId)) {
    return cache.get(gameId) ?? null;
  }

  const { data, error } = await supabase
    .from("games")
    .select("rsvp_cycle_at")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    console.error("cycleAt lookup failed", gameId, error.message);
    cache.set(gameId, null);
    return null;
  }

  const cycleAt = data?.rsvp_cycle_at ?? null;
  cache.set(gameId, cycleAt);
  return cycleAt;
}

async function markProcessed(supabase: SupabaseClient, rowId: number) {
  await supabase
    .from("push_outbox")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", rowId);
}

function readAttemptCount(payload: Record<string, unknown> | null) {
  const attempts = payload?.attempts;
  return typeof attempts === "number" && Number.isFinite(attempts) ? attempts : 0;
}

async function recordDeliveryFailure(supabase: SupabaseClient, row: OutboxRow) {
  const attempts = readAttemptCount(row.payload) + 1;
  const payload = {
    ...(row.payload ?? {}),
    attempts,
    last_failed_at: new Date().toISOString(),
  };

  if (attempts >= MAX_DELIVERY_ATTEMPTS) {
    console.error("Abandoning outbox row after max delivery attempts", row.id, row.event_type);
    await markProcessed(supabase, row.id);
    return "abandoned" as const;
  }

  await supabase
    .from("push_outbox")
    .update({ payload })
    .eq("id", row.id);

  return "retry" as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!isPushConfigured()) {
    return jsonResponse({ error: "Push is not configured" }, 503);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const dbSchema = Deno.env.get("SUPABASE_DB_SCHEMA") ?? "pickup_frisbee";

    if (!url || !serviceKey) {
      return jsonResponse({ error: "Supabase is not configured" }, 503);
    }

    const supabase = createClient(url, serviceKey, {
      db: { schema: dbSchema },
    });

    const { data: phaseLiveEnqueued, error: phaseLiveError } = await supabase.rpc(
      "enqueue_due_phase_live_events",
    );

    if (phaseLiveError) {
      console.error("Due phase_live enqueue failed", phaseLiveError.message);
      return jsonResponse({ error: phaseLiveError.message }, 500);
    }

    const { data: rows, error: fetchError } = await supabase
      .from("push_outbox")
      .select("id, group_id, game_id, event_type, payload, exclude_subscriber_ids")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    const batch = rows ?? [];
    const deliverRsvpIds = winningRsvpBadgeRowIds(batch);
    const deliverCheckinIds = winningCheckinBadgeRowIds(batch);

    let processed = 0;
    let sentTotal = 0;
    let skipped = 0;
    let retrying = 0;
    let abandoned = 0;
    const cycleAtCache = new Map<string, string | null>();

    for (const row of batch) {
      const isSupersededRsvp =
        row.game_id &&
        isRsvpBadgeEventType(row.event_type) &&
        !deliverRsvpIds.has(row.id);

      const isSupersededCheckin =
        row.game_id &&
        isCheckinBadgeEventType(row.event_type) &&
        !deliverCheckinIds.has(row.id);

      if (isSupersededRsvp || isSupersededCheckin) {
        skipped += 1;
        await markProcessed(supabase, row.id);
        processed += 1;
        continue;
      }

      if (isRsvpBadgeEventType(row.event_type)) {
        if (await isStaleRsvpOutboxRow(supabase, row)) {
          skipped += 1;
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }
      } else if (isCheckinBadgeEventType(row.event_type)) {
        if (await isStaleCheckinOutboxRow(supabase, row)) {
          skipped += 1;
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }
      } else if (row.event_type === "game_cancelled") {
        if (await isStaleCancelledOutboxRow(supabase, row)) {
          skipped += 1;
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }
      } else if (row.event_type === "phase_live") {
        if (await isStalePhaseLiveOutboxRow(supabase, row)) {
          skipped += 1;
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }
      } else if (row.event_type === "chat_chatter") {
        if (await isStaleChatterOutboxRow(supabase, row)) {
          skipped += 1;
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }
      }

      const payload = await materializePushPayload(supabase, row);

      if (!payload) {
        skipped += 1;
        await markProcessed(supabase, row.id);
        processed += 1;
        continue;
      }

      try {
        const cycleAt = await resolveCycleAt(supabase, row.game_id, cycleAtCache);

        const result = await sendPush({
          groupId: row.group_id,
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          url: payload.url,
          excludeSubscriberIds: row.exclude_subscriber_ids ?? [],
          eventType: row.event_type,
          gameId: row.game_id,
          cycleAt,
        });
        sentTotal += result.sent;

        if (result.sent > 0 || result.attempted === 0) {
          await markProcessed(supabase, row.id);
          processed += 1;
          continue;
        }

        const outcome = await recordDeliveryFailure(supabase, row);
        if (outcome === "retry") {
          retrying += 1;
        } else {
          abandoned += 1;
          processed += 1;
        }
      } catch (error) {
        console.error("Outbox push failed", row.id, error);
        const outcome = await recordDeliveryFailure(supabase, row);
        if (outcome === "retry") {
          retrying += 1;
        } else {
          abandoned += 1;
          processed += 1;
        }
      }
    }

    return jsonResponse({
      phase_live_enqueued: phaseLiveEnqueued ?? 0,
      processed,
      sent: sentTotal,
      skipped,
      retrying,
      abandoned,
      pending: batch.length,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
