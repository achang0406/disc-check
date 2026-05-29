import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { isIosDevice, isStandaloneDisplay } from "../utils/pwaInstall.js";

const PUSH_OPTED_OUT_GAMES_KEY = "disc_push_opted_out_games";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function isVapidConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && !VAPID_PUBLIC_KEY.includes("your-vapid"));
}

function readOptedOutGames() {
  try {
    const raw = localStorage.getItem(PUSH_OPTED_OUT_GAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isGamePushOptedOut(gameId) {
  if (!gameId) return false;
  return readOptedOutGames().includes(gameId);
}

function setGamePushOptedOut(gameId, optedOut) {
  if (!gameId) return;
  const games = new Set(readOptedOutGames());
  if (optedOut) {
    games.add(gameId);
  } else {
    games.delete(gameId);
  }
  localStorage.setItem(PUSH_OPTED_OUT_GAMES_KEY, JSON.stringify([...games]));
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

async function hasDbPushRegistration({ gameId, subscriberId }) {
  if (!isSupabaseConfigured() || !gameId) return false;

  const supabase = getSupabase();

  if (subscriberId) {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("game_id", gameId)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();
    if (data) return true;
  }

  const endpoint = await getBrowserPushEndpoint();
  if (!endpoint) return false;

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("game_id", gameId)
    .eq("endpoint", endpoint)
    .maybeSingle();

  return Boolean(data);
}

/** Whether this user is subscribed to chat push for a game (DB is source of truth). */
export async function isSubscribedToGameChatPush({ gameId, subscriberId }) {
  if (!gameId) return false;
  return hasDbPushRegistration({ gameId, subscriberId });
}

async function savePushSubscription({ gameId, subscriberId, subscription }) {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  const json = subscription.toJSON();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      game_id: gameId,
      subscriber_id: subscriberId,
      endpoint: json.endpoint,
      subscription: json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  return !error;
}

async function deletePushRegistration({ gameId, subscriberId }) {
  if (!isSupabaseConfigured() || !gameId) return false;

  const supabase = getSupabase();
  const endpoint = await getBrowserPushEndpoint();
  let deleted = false;

  if (subscriberId) {
    const { error, count } = await supabase
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .eq("game_id", gameId)
      .eq("subscriber_id", subscriberId);
    if (error) {
      console.warn("Push unsubscribe failed (subscriber)", error.message ?? error);
    } else if ((count ?? 0) > 0) {
      deleted = true;
    }
  }

  if (endpoint) {
    const { error, count } = await supabase
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .eq("game_id", gameId)
      .eq("endpoint", endpoint);
    if (error) {
      console.warn("Push unsubscribe failed (endpoint)", error.message ?? error);
    } else if ((count ?? 0) > 0) {
      deleted = true;
    }
  }

  return deleted;
}

export async function ensureChatPushRegistration({ gameId, subscriberId }) {
  if (!gameId || !subscriberId || isGamePushOptedOut(gameId) || !isWebPushSupported()) {
    return false;
  }

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
  }

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return false;
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

    return savePushSubscription({ gameId, subscriberId, subscription });
  } catch (error) {
    console.warn("Chat push registration failed", error);
    return false;
  }
}

export async function subscribeToGameChatPush({ gameId, subscriberId }) {
  const support = getWebPushSupportState();
  if (!support.supported) {
    return { ok: false, reason: support.reason };
  }

  if (!gameId || !subscriberId) {
    return { ok: false, reason: "missing-identity" };
  }

  setGamePushOptedOut(gameId, false);
  const saved = await ensureChatPushRegistration({ gameId, subscriberId });
  return { ok: saved, reason: saved ? null : "subscribe-failed" };
}

export async function unsubscribeFromGameChatPush({ gameId, subscriberId }) {
  if (!gameId) {
    return { ok: false, reason: "missing-identity" };
  }

  setGamePushOptedOut(gameId, true);
  await deletePushRegistration({ gameId, subscriberId });
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
