import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { shouldSuppressPush } from "./lib/observedAlerts.js";

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

let observedAlertsSnapshot = { games: {}, groups: {} };

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "sync-observed-alerts") {
    observedAlertsSnapshot = event.data.data ?? { games: {}, groups: {} };
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
  const body = payload.body || "New update";
  const tag = payload.tag || "disc-check-push";
  const url = payload.url || "/";
  const groupId = payload.groupId || null;
  const eventType = payload.eventType || null;
  const gameId = payload.gameId || null;
  const cycleAt = payload.cycleAt || null;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const appIsForeground = windowClients.some(
        (client) => client.visibilityState === "visible",
      );
      if (appIsForeground) return;

      if (
        shouldSuppressPush({
          eventType,
          gameId,
          cycleAt,
          observed: observedAlertsSnapshot,
        })
      ) {
        return;
      }

      await self.registration.showNotification(title, {
        body,
        tag,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: { url, groupId },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || "/", self.location.origin).href;

  event.waitUntil(openNotificationTarget(targetUrl));
});
