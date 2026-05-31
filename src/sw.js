import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

const BADGE_CACHE = "disc-check-badge-v1";
const BADGE_COUNT_KEY = "/count";
const PUSH_MESSAGE_PATH = "/__push-message__";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function readBadgeCount() {
  try {
    const cache = await caches.open(BADGE_CACHE);
    const response = await cache.match(BADGE_COUNT_KEY);
    if (!response) return 0;
    const count = Number.parseInt(await response.text(), 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

async function writeBadgeCount(count) {
  const cache = await caches.open(BADGE_CACHE);
  if (count <= 0) {
    await cache.delete(BADGE_COUNT_KEY);
    return;
  }
  await cache.put(BADGE_COUNT_KEY, new Response(String(count)));
}

async function incrementBadgeCount() {
  const count = (await readBadgeCount()) + 1;
  await writeBadgeCount(count);

  if ("setAppBadge" in self.navigator) {
    await self.navigator.setAppBadge(count);
  }
}

async function clearBadgeCount() {
  await writeBadgeCount(0);
  if ("clearAppBadge" in self.navigator) {
    await self.navigator.clearAppBadge();
  }
}

async function stashPushMessage(gameId, message) {
  if (!gameId || !message?.id) return;

  try {
    const cache = await caches.open("disc-check-push-v1");
    await cache.put(
      new Request(`${self.location.origin}${PUSH_MESSAGE_PATH}/${gameId}/${message.id}`),
      new Response(JSON.stringify(message)),
    );
  } catch {
    // Ignore cache write failures.
  }
}

async function notifyOpenClients(payload) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: "push-message",
      gameId: payload.gameId,
      message: payload.message,
    });
  }
}

async function openNotificationTarget(targetUrl, payload) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clients) {
    if (!client.url.startsWith(self.location.origin)) continue;

    await client.focus();

    if ("navigate" in client) {
      try {
        await client.navigate(targetUrl);
      } catch {
        // Fall back to in-app navigation below.
      }
    }

    client.postMessage({
      type: "notification-open",
      url: targetUrl,
      gameId: payload.gameId,
      message: payload.message,
    });
    return;
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(targetUrl);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-badge") {
    event.waitUntil(clearBadgeCount());
    return;
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "DiscCheck", body: event.data.text() };
  }

  const title = payload.title || "DiscCheck";
  const body = payload.body || "New chat message";
  const tag = payload.tag || "disc-check-chat";
  const url = payload.url || "/";
  const gameId = payload.gameId || null;
  const message = payload.message || null;
  const showNotification = payload.showNotification !== false;

  event.waitUntil(
    (async () => {
      if (gameId && message) {
        await stashPushMessage(gameId, message);
        await notifyOpenClients({ gameId, message });
      }

      if (showNotification) {
        await self.registration.showNotification(title, {
          body,
          tag,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          data: { url, gameId, message },
        });
        await incrementBadgeCount();
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/", self.location.origin).href;
  const payload = {
    gameId: data.gameId || null,
    message: data.message || null,
  };

  event.waitUntil(
    (async () => {
      await clearBadgeCount();
      if (payload.gameId && payload.message) {
        await stashPushMessage(payload.gameId, payload.message);
      }
      await openNotificationTarget(targetUrl, payload);
    })(),
  );
});
