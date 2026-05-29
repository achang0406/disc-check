import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  stashPushMessage,
} from "../utils/pushMessageStore.js";

function gameIdFromUrl(url) {
  try {
    const match = new URL(url, window.location.origin).pathname.match(/^\/games\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function useServiceWorkerNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const onMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "push-message" && data.gameId && data.message) {
        void stashPushMessage(data.gameId, data.message);
        return;
      }

      if (data.type !== "notification-open") return;

      const path = (() => {
        try {
          return new URL(data.url || "/", window.location.origin).pathname;
        } catch {
          return "/";
        }
      })();

      const targetGameId = data.gameId || gameIdFromUrl(path);
      if (targetGameId && data.message) {
        void stashPushMessage(targetGameId, data.message);
      }

      navigate(path, { replace: false });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);
}
