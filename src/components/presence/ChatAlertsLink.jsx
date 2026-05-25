import { useCallback, useEffect, useState } from "react";
import { requestChatNotificationPermission } from "../../hooks/useChatAlerts.js";

function readNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export default function ChatAlertsLink({ className = "" }) {
  const [permission, setPermission] = useState(readNotificationPermission);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const sync = () => setPermission(readNotificationPermission());
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const handleEnable = useCallback(async () => {
    setRequesting(true);
    try {
      setPermission(await requestChatNotificationPermission());
    } finally {
      setRequesting(false);
    }
  }, []);

  if (permission === "unsupported" || permission === "granted") {
    return null;
  }

  if (permission === "denied") {
    return (
      <p className={["chat-alerts-link", "chat-alerts-link--muted", className].filter(Boolean).join(" ")}>
        Notifications are blocked in your browser settings.
      </p>
    );
  }

  return (
    <button
      type="button"
      className={["chat-alerts-link", className].filter(Boolean).join(" ")}
      onClick={handleEnable}
      disabled={requesting}
    >
      {requesting ? "Enabling…" : "Get notified when someone messages you"}
    </button>
  );
}
