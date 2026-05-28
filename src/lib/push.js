import { getSupabase, isSupabaseConfigured } from "./supabase.js";

const CHAT_PUSH_GAMES_KEY = "disc_chat_push_games";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function readChattedGames() {
  try {
    const raw = localStorage.getItem(CHAT_PUSH_GAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function markGameChatted(gameId) {
  if (!gameId) return;
  const games = new Set(readChattedGames());
  games.add(gameId);
  localStorage.setItem(CHAT_PUSH_GAMES_KEY, JSON.stringify([...games]));
}

export function hasChattedInGame(gameId) {
  if (!gameId) return false;
  return readChattedGames().includes(gameId);
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
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
  if (!hasChattedInGame(gameId)) return false;

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
  } catch {
    return false;
  }
}

export async function registerChatPushAfterSend({ gameId, subscriberId }) {
  if (!gameId || !subscriberId) return false;

  markGameChatted(gameId);
  return ensureChatPushRegistration({ gameId, subscriberId });
}

export async function notifyChatPush({
  gameId,
  senderId,
  senderName,
  text,
  messageId,
  gameName,
}) {
  if (!isSupabaseConfigured() || !gameId || !senderId || !text) return;

  const supabase = getSupabase();
  const { error } = await supabase.functions.invoke("notify-chat", {
    body: {
      gameId,
      senderId,
      senderName,
      text,
      messageId,
      gameName,
    },
  });

  if (error) {
    console.warn("Chat push notify failed", error);
  }
}
