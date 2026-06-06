import { createClient } from "jsr:@supabase/supabase-js@2";
import { isPushConfigured, sendPush } from "../_shared/pushSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_LIMIT = 50;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: phaseError } = await supabase.rpc("enqueue_phase_live_events");
    if (phaseError) {
      console.error("phase_live scan failed", phaseError.message);
    }

    const { data: rows, error: fetchError } = await supabase
      .from("push_outbox")
      .select("id, group_id, payload, exclude_subscriber_ids")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500);
    }

    let processed = 0;
    let sentTotal = 0;

    for (const row of rows ?? []) {
      const payload = row.payload as {
        title?: string;
        body?: string;
        tag?: string;
        url?: string;
      };

      if (!payload?.title || !payload?.body || !payload?.tag || !payload?.url) {
        await supabase
          .from("push_outbox")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", row.id);
        processed += 1;
        continue;
      }

      try {
        const result = await sendPush({
          groupId: row.group_id,
          title: payload.title,
          body: payload.body,
          tag: payload.tag,
          url: payload.url,
          excludeSubscriberIds: row.exclude_subscriber_ids ?? [],
        });
        sentTotal += result.sent;
      } catch (error) {
        console.error("Outbox push failed", row.id, error);
      }

      await supabase
        .from("push_outbox")
        .update({ processed_at: new Date().toISOString() })
        .eq("id", row.id);
      processed += 1;
    }

    return jsonResponse({ processed, sent: sentTotal, pending: (rows ?? []).length });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
