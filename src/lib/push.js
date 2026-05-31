import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { isIosDevice, isStandaloneDisplay } from "../utils/pwaInstall.js";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function isVapidConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && !VAPID_PUBLIC_KEY.includes("your-vapid"));
}

/** @returns {{ supported: boolean, reason: string | null }} */
export function getWebPushSupportState() {
  if (!isVapidConfigured()) {
    return { supported: false, reason: "misconfigured" };
  }

  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return { supported: false, reason: "unsupported" };
  }

  if (isIosDevice() && !isStandaloneDisplay()) {
    return { supported: false, reason: "ios-install-required" };
  }

  return { supported: true, reason: null };
}

export function isWebPushSupported() {
  return getWebPushSupportState().supported;
}

/** Show the chat bell only in the installed web app (standalone / Home Screen). */
export function canShowChatPushBell() {
  return isStandaloneDisplay() && isWebPushSupported();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getBrowserPushEndpoint() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    return (await registration.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

async function findPushRegistration({ gameId, subscriberId }) {
  if (!isSupabaseConfigured() || !gameId) return null;

  const supabase = getSupabase();

  if (subscriberId) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id, notifications_enabled")
      .eq("game_id", gameId)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();
    if (data) return data;
  }

  const endpoint = await getBrowserPushEndpoint();
  if (!endpoint) return null;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, notifications_enabled")
    .eq("game_id", gameId)
    .eq("endpoint", endpoint)
    .maybeSingle();

  return data ?? null;
}

/** Whether visible chat alerts (bell) are on for this game. */
export async function isSubscribedToGameChatPush({ gameId, subscriberId }) {
  if (!gameId) return false;
  const row = await findPushRegistration({ gameId, subscriberId });
  return row?.notifications_enabled === true;
}

async function setNotificationsEnabled({ gameId, subscriberId, enabled }) {
  if (!isSupabaseConfigured() || !gameId) return false;

  const supabase = getSupabase();
  const endpoint = await getBrowserPushEndpoint();
  let updated = false;

  if (subscriberId) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .update({ notifications_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("game_id", gameId)
      .eq("subscriber_id", subscriberId)
      .select("id");
    if (!error && data?.length > 0) {
      updated = true;
    }
  }

  if (!updated && endpoint) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .update({ notifications_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("game_id", gameId)
      .eq("endpoint", endpoint)
      .select("id");
    if (!error && data?.length > 0) {
      updated = true;
    }
  }

  return updated;
}

async function savePushSubscription({ gameId, subscriberId, subscription, notificationsEnabled }) {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const json = subscription.toJSON();
  const existing = await findPushRegistration({ gameId, subscriberId });
  const enabled =
    typeof notificationsEnabled === "boolean"
      ? notificationsEnabled
      : (existing?.notifications_enabled ?? false);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      game_id: gameId,
      subscriber_id: subscriberId,
      endpoint: json.endpoint,
      subscription: json,
      notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  return !error;
}

async function ensureBrowserPushSubscription(requestPermission = false) {
  if (!isWebPushSupported()) return null;

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    if (!requestPermission) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    return subscription;
  } catch (error) {
    console.warn("Chat push registration failed", error);
    return null;
  }
}

/** Register for silent background chat sync (no visible alerts unless bell is on). */
export async function ensureBackgroundChatPushSync({ gameId, subscriberId }) {
  if (!gameId || !subscriberId || !isWebPushSupported()) {
    return false;
  }

  const subscription = await ensureBrowserPushSubscription(false);
  if (!subscription) return false;

  return savePushSubscription({ gameId, subscriberId, subscription });
}

export async function ensureChatPushRegistration({ gameId, subscriberId }) {
  if (!gameId || !subscriberId || !isWebPushSupported()) {
    return false;
  }

  const subscription = await ensureBrowserPushSubscription(true);
  if (!subscription) return false;

  return savePushSubscription({
    gameId,
    subscriberId,
    subscription,
    notificationsEnabled: true,
  });
}

export async function subscribeToGameChatPush({ gameId, subscriberId }) {
  const support = getWebPushSupportState();
  if (!support.supported) {
    return { ok: false, reason: support.reason };
  }

  if (!gameId || !subscriberId) {
    return { ok: false, reason: "missing-identity" };
  }

  const saved = await ensureChatPushRegistration({ gameId, subscriberId });
  return { ok: saved, reason: saved ? null : "subscribe-failed" };
}

export async function unsubscribeFromGameChatPush({ gameId, subscriberId }) {
  if (!gameId) {
    return { ok: false, reason: "missing-identity" };
  }

  await setNotificationsEnabled({ gameId, subscriberId, enabled: false });
  return { ok: true, reason: null };
}

export async function notifyChatPush({
  gameId,
  senderId,
  senderName,
  senderColor,
  text,
  messageId,
  gameName,
  createdAt,
}) {
  if (!isSupabaseConfigured() || !gameId || !senderId || !text) return;

  const supabase = getSupabase();
  const { error } = await supabase.functions.invoke("notify-chat", {
    body: {
      gameId,
      senderId,
      senderName,
      senderColor,
      text,
      messageId,
      gameName,
      createdAt,
    },
  });

  if (error) {
    console.warn("Chat push notify failed", error.message ?? error);
  }
}
