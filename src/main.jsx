import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import { flushObservedAlertsServiceWorkerSync, initObservedAlertsSync } from "./lib/observedAlerts.js";
import { initPwaInstallPromptCapture } from "./utils/pwaInstallPrompt.js";

initPwaInstallPromptCapture();
initObservedAlertsSync();

const host = typeof window !== "undefined" ? window.location.hostname : "";
const shouldRegisterServiceWorker =
  import.meta.env.PROD ||
  import.meta.env.VITE_ENABLE_SW === "true" ||
  host.includes("ngrok");

if (shouldRegisterServiceWorker) {
  registerSW({
    immediate: true,
    onRegistered() {
      flushObservedAlertsServiceWorkerSync();
    },
    onNeedRefresh() {
      const reload = () => window.location.reload();
      if (document.visibilityState === "visible") {
        reload();
        return;
      }
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reload();
      }, { once: true });
    },
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
