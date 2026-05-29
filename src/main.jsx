import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";

const host = typeof window !== "undefined" ? window.location.hostname : "";
const shouldRegisterServiceWorker =
  import.meta.env.PROD ||
  import.meta.env.VITE_ENABLE_SW === "true" ||
  host.includes("ngrok");

if (shouldRegisterServiceWorker) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
