/** Captures beforeinstallprompt before React mounts so the install hook never misses it. */

let deferredPrompt = null;
const listeners = new Set();

export function initPwaInstallPromptCapture() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    for (const listener of listeners) {
      listener(deferredPrompt);
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    for (const listener of listeners) {
      listener(null);
    }
  });
}

export function getDeferredPwaInstallPrompt() {
  return deferredPrompt;
}

export function setDeferredPwaInstallPrompt(event) {
  deferredPrompt = event;
}

export function subscribeDeferredPwaInstallPrompt(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
