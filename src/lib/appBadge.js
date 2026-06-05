function supportsAppBadge() {
  return typeof navigator !== "undefined" && "setAppBadge" in navigator;
}

async function postToActiveWorker(message) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.ready;
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage(message);
  } catch {
    // No service worker registered.
  }
}

export async function clearAppBadge() {
  if (supportsAppBadge()) {
    try {
      await navigator.clearAppBadge();
    } catch {
      // Badge API unavailable in this context.
    }
  }

  await postToActiveWorker({ type: "clear-badge" });
}

export async function incrementAppBadge(by = 1) {
  const amount = Number.isFinite(by) && by > 0 ? Math.floor(by) : 1;
  await postToActiveWorker({ type: "increment-badge", by: amount });
}
