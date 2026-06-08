import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@disccheck.app";

export type PushSendRequest = {
  groupId: string;
  title: string;
  body: string;
  tag: string;
  url: string;
  excludeSubscriberIds?: string[];
};

export type PushSendResult = {
  sent: number;
  stale: number;
};

function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function isPushConfigured(): boolean {
  return Boolean(vapidPublicKey && vapidPrivateKey);
}

export async function sendPush(request: PushSendRequest): Promise<PushSendResult> {
  if (!isPushConfigured()) {
    throw new Error("Push is not configured");
  }

  const { groupId, title, body, tag, url, excludeSubscriberIds = [] } = request;
  const exclude = new Set(excludeSubscriberIds.filter(Boolean));

  const supabase = getServiceClient();
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription, subscriber_id")
    .eq("group_id", groupId)
    .eq("notifications_enabled", true);

  if (subsError) {
    throw new Error(subsError.message);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);

  let sent = 0;
  const staleEndpoints: string[] = [];

  for (const row of subscriptions ?? []) {
    if (row.subscriber_id && exclude.has(row.subscriber_id)) {
      continue;
    }

    const subscription =
      typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;

    if (!subscription?.endpoint || !subscription?.keys) {
      staleEndpoints.push(row.endpoint);
      continue;
    }

    const payload = JSON.stringify({
      title,
      body,
      tag,
      url,
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

  return { sent, stale: staleEndpoints.length };
}
