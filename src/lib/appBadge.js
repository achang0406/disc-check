const BADGE_CACHE = "disc-check-badge-v1";
const BADGE_COUNT_KEY = "/count";

async function readCachedBadgeCount() {
  if (typeof caches === "undefined") return 0;

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

async function writeCachedBadgeCount(count) {
  if (typeof caches === "undefined") return;

  try {
    const cache = await caches.open(BADGE_CACHE);
    if (count <= 0) {
      await cache.delete(BADGE_COUNT_KEY);
      return;
    }
    await cache.put(BADGE_COUNT_KEY, new Response(String(count)));
  } catch {
    // Badge cache unavailable.
  }
}

function supportsAppBadge() {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

export async function setAppBadgeCount(count) {
  if (!supportsAppBadge()) return false;

  const next = Math.max(0, Math.floor(count));
  await writeCachedBadgeCount(next);

  try {
    if (next === 0) {
      await navigator.clearAppBadge();
    } else {
      await navigator.setAppBadge(next);
    }
    return true;
  } catch {
    return false;
  }
}

export async function incrementAppBadge(by = 1) {
  if (!supportsAppBadge()) return false;

  const current = await readCachedBadgeCount();
  return setAppBadgeCount(current + by);
}

export async function clearAppBadge() {
  return setAppBadgeCount(0);
}

export function notifyServiceWorkerClearBadge() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: "clear-badge" });
}
