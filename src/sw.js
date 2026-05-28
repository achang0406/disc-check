import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

const BADGE_CACHE = "disc-check-badge-v1";
const BADGE_COUNT_KEY = "/count";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-badge") {
    event.waitUntil(clearBadgeCount());
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

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: { url },
      });
      await incrementBadgeCount();
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      await clearBadgeCount();

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })(),
  );
});
