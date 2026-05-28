import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@disccheck.app";

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

  if (!vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: "Push is not configured" }, 503);
  }

  try {
    const { gameId, senderId, senderName, text, messageId, gameName } = await req.json();

    if (!gameId || !senderId || !text) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { count: senderCount, error: senderError } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("subscriber_id", senderId);

    if (senderError) {
      return jsonResponse({ error: senderError.message }, 500);
    }

    if (!senderCount) {
      return jsonResponse({ error: "Sender is not registered for chat push" }, 403);
    }

    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .eq("game_id", gameId)
      .neq("subscriber_id", senderId);

    if (subsError) {
      return jsonResponse({ error: subsError.message }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const context = typeof gameName === "string" && gameName.trim() ? gameName.trim() : "game chat";
    const title = `${senderName || "Someone"} · ${context}`;
    const payload = JSON.stringify({
      title,
      body: text,
      tag: `disc-check-chat-${gameId}-${messageId || Date.now()}`,
      url: `/games/${gameId}`,
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const row of subscriptions ?? []) {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sent += 1;
      } catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(row.endpoint);
        }
      }
    }

    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
    }

    return jsonResponse({ sent, stale: staleEndpoints.length });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
