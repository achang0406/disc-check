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

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

async function getBrowserPushEndpoint() {
  try {
    const registration = await getServiceWorkerRegistration();
    if (!registration?.pushManager) return null;
    return (await registration.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

async function findPushRegistration({ groupId, subscriberId }) {
  if (!isSupabaseConfigured() || !groupId) return null;

  const supabase = getSupabase();

  if (subscriberId && groupId) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id, group_id, notifications_enabled")
      .eq("group_id", groupId)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();
    if (data) return data;
  }

  const endpoint = await getBrowserPushEndpoint();
  if (!endpoint) return null;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, group_id, notifications_enabled")
    .eq("endpoint", endpoint)
    .maybeSingle();

  return data ?? null;
}

/** Whether visible chat alerts (bell) are on for this group. */
export async function isSubscribedToGroupChatPush({ groupId, subscriberId }) {
  if (!groupId) return false;
  const row = await findPushRegistration({ groupId, subscriberId });
  return row?.notifications_enabled === true && row?.group_id === groupId;
}

async function setNotificationsEnabled({ groupId, subscriberId, enabled }) {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const endpoint = await getBrowserPushEndpoint();
  if (!endpoint) return false;

  const patch = {
    notifications_enabled: enabled,
    updated_at: new Date().toISOString(),
  };

  if (enabled) {
    if (!groupId) return false;
    patch.group_id = groupId;
    if (subscriberId) {
      patch.subscriber_id = subscriberId;
    }
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .update(patch)
    .eq("endpoint", endpoint)
    .select("id");

  return !error && (data?.length ?? 0) > 0;
}

async function savePushSubscription({ groupId, subscriberId, subscription, notificationsEnabled }) {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const json = subscription.toJSON();
  const existing = await findPushRegistration({ groupId, subscriberId });
  const enabled =
    typeof notificationsEnabled === "boolean"
      ? notificationsEnabled
      : (existing?.notifications_enabled ?? false);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      group_id: groupId,
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

function subscribeFailureReason(permission) {
  if (permission === "denied") return "denied";
  return "subscribe-failed";
}

async function ensureBrowserPushSubscription() {
  if (!isWebPushSupported()) return { subscription: null, reason: getWebPushSupportState().reason };

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { subscription: null, reason: subscribeFailureReason(permission) };
    }
  }

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return { subscription: null, reason: subscribeFailureReason(Notification.permission) };
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

    return { subscription, reason: null };
  } catch (error) {
    console.warn("Chat push registration failed", error);
    const reason = error?.name === "NotAllowedError" ? "denied" : "subscribe-failed";
    return { subscription: null, reason };
  }
}

export async function ensureChatPushRegistration({ groupId, subscriberId }) {
  if (!groupId || !subscriberId || !isWebPushSupported()) {
    return { ok: false, reason: "missing-identity" };
  }

  const { subscription, reason } = await ensureBrowserPushSubscription();
  if (!subscription) return { ok: false, reason: reason ?? "subscribe-failed" };

  const saved = await savePushSubscription({
    groupId,
    subscriberId,
    subscription,
    notificationsEnabled: true,
  });

  return { ok: saved, reason: saved ? null : "subscribe-failed" };
}

export async function subscribeToGroupChatPush({ groupId, subscriberId }) {
  const support = getWebPushSupportState();
  if (!support.supported) {
    return { ok: false, reason: support.reason };
  }

  if (!groupId || !subscriberId) {
    return { ok: false, reason: "missing-identity" };
  }

  return ensureChatPushRegistration({ groupId, subscriberId });
}

export async function unsubscribeFromGroupChatPush({ groupId, subscriberId }) {
  if (!groupId) {
    return { ok: false, reason: "missing-identity" };
  }

  const updated = await setNotificationsEnabled({ groupId, subscriberId, enabled: false });
  return { ok: updated, reason: updated ? null : "subscribe-failed" };
}

export function buildGameDeepLink(groupId, gameId) {
  return `/groups/${groupId}?game=${gameId}`;
}

export async function resyncGroupChatPushSubscription({ groupId, subscriberId }) {
  if (!groupId || !subscriberId) return false;
  const active = await isSubscribedToGroupChatPush({ groupId, subscriberId });
  if (!active) return false;
  const result = await ensureChatPushRegistration({ groupId, subscriberId });
  return result.ok;
}
