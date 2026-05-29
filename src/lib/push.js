import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { isIosDevice, isStandaloneDisplay } from "../utils/pwaInstall.js";

const PUSH_SUBSCRIBED_GAMES_KEY = "disc_push_subscribed_games";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function isVapidConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && !VAPID_PUBLIC_KEY.includes("your-vapid"));
}

function readSubscribedGames() {
  try {
    const raw = localStorage.getItem(PUSH_SUBSCRIBED_GAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markGamePushSubscribed(gameId) {
  if (!gameId) return;
  const games = new Set(readSubscribedGames());
  games.add(gameId);
  localStorage.setItem(PUSH_SUBSCRIBED_GAMES_KEY, JSON.stringify([...games]));
}

export function isGamePushSubscribed(gameId) {
  if (!gameId) return false;
  return readSubscribedGames().includes(gameId);
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

export async function ensureChatPushRegistration({ gameId, subscriberId }) {
  if (!gameId || !subscriberId || !isWebPushSupported()) return false;

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

/** Opt in from the game detail button — permission + PushManager subscription + DB row. */
export async function registerChatPushAlerts({ gameId, subscriberId }) {
  const support = getWebPushSupportState();
  if (!support.supported) {
    return { ok: false, reason: support.reason };
  }

  if (!gameId || !subscriberId) {
    return { ok: false, reason: "missing-identity" };
  }

  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, reason: "denied" };
    }
  }

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const saved = await ensureChatPushRegistration({ gameId, subscriberId });
  if (saved) {
    markGamePushSubscribed(gameId);
  }

  return { ok: saved, reason: saved ? null : "subscribe-failed" };
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
