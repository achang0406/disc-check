import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

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
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url, groupId },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/", self.location.origin).href;

  event.waitUntil(openNotificationTarget(targetUrl));
});
