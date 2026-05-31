import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function useServiceWorkerNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const onMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "notification-open") return;

      const path = (() => {
        try {
          return new URL(data.url || "/", window.location.origin).pathname;
        } catch {
          return "/";
        }
      })();

      navigate(path, { replace: false });
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);
}
