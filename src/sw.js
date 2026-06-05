import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

const BADGE_CACHE = "disc-check-badge-v1";
const BADGE_COUNT_KEY = "/count";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  // Wait for the page to send SKIP_WAITING so a backgrounded PWA is not left on stale assets.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.matchAll({ type: "window" }));
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "push-subscription-change" });
      }
    })(),
  );
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

async function openNotificationTarget(targetUrl) {
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
  const groupId = payload.groupId || null;

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: { url, groupId },
      });
      await incrementBadgeCount();
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      await clearBadgeCount();
      await openNotificationTarget(targetUrl);
    })(),
  );
});
