import { isPushConfigured, sendPush } from "../_shared/pushSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { groupId, title, body, tag, url, excludeSubscriberIds } = await req.json();

    if (!groupId || !title || !body || !tag || !url) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    const result = await sendPush({
      groupId,
      title,
      body,
      tag,
      url,
      excludeSubscriberIds: Array.isArray(excludeSubscriberIds) ? excludeSubscriberIds : [],
    });

    return jsonResponse(result);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
