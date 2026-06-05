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
    const { groupId, senderId, senderName, text, messageId, groupName } = await req.json();

    if (!groupId || !senderId || !text) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, subscription")
      .eq("group_id", groupId)
      .eq("notifications_enabled", true)
      .neq("subscriber_id", senderId);

    if (subsError) {
      return jsonResponse({ error: subsError.message }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const context = typeof groupName === "string" && groupName.trim() ? groupName.trim() : "group chat";
    const title = `${senderName || "Someone"} · ${context}`;
    const resolvedMessageId = messageId || `${senderId}-${Date.now()}`;
    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const row of subscriptions ?? []) {
      const subscription =
        typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;

      if (!subscription?.endpoint || !subscription?.keys) {
        staleEndpoints.push(row.endpoint);
        continue;
      }

      const payload = JSON.stringify({
        title,
        body: text,
        tag: `disc-check-chat-${groupId}-${resolvedMessageId}`,
        url: `/groups/${groupId}`,
        groupId,
      });

      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
        sent += 1;
      } catch (error) {
        const statusCode = error?.statusCode;
        console.error("Push delivery failed", row.endpoint, statusCode, error?.body ?? error?.message);
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
