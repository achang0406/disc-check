import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useServiceWorkerNavigation({ onPushSubscriptionChange } = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const onMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "notification-open") {
        const path = (() => {
          try {
            return new URL(data.url || "/", window.location.origin).pathname;
          } catch {
            return "/";
          }
        })();

        navigate(path, { replace: false });
        return;
      }

      if (data.type === "push-subscription-change") {
        onPushSubscriptionChange?.();
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate, onPushSubscriptionChange]);
}
