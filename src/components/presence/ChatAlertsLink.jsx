import { useCallback, useEffect, useState } from "react";
import {
  getWebPushSupportState,
  registerChatPushAlerts,
} from "../../lib/push.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function readNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

const ALERT_FAILURE_COPY = {
  denied: "Notifications are blocked in your browser settings.",
  "subscribe-failed": "Could not enable push alerts. Try again after reloading the app.",
  "missing-identity": "Finish loading this game, then try again.",
};

export default function ChatAlertsLink({ className = "", gameId = "", subscriberId = "" }) {
  const [permission, setPermission] = useState(readNotificationPermission);
  const [requesting, setRequesting] = useState(false);
  const [failureReason, setFailureReason] = useState(null);
  const [pushSupport, setPushSupport] = useState(() => getWebPushSupportState());

  useEffect(() => {
    const sync = () => {
      setPermission(readNotificationPermission());
      setPushSupport(getWebPushSupportState());
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (permission !== "granted" || !gameId || !subscriberId) return;
    void registerChatPushAlerts({ gameId, subscriberId });
  }, [permission, gameId, subscriberId]);

  const handleEnable = useCallback(async () => {
    setRequesting(true);
    setFailureReason(null);
    try {
      const result = await registerChatPushAlerts({ gameId, subscriberId });
      setPermission(readNotificationPermission());
      if (!result.ok) {
        setFailureReason(result.reason);
      }
    } finally {
      setRequesting(false);
    }
  }, [gameId, subscriberId]);

  if (pushSupport.reason === "ios-install-required") {
    return (
      <p className={["chat-alerts-link", "chat-alerts-link--muted", className].filter(Boolean).join(" ")}>
        Add DiscCheck to your Home Screen to receive push notifications.
      </p>
    );
  }

  if (!pushSupport.supported) {
    return null;
  }

  if (permission === "unsupported" || permission === "granted") {
    return null;
  }

  if (permission === "denied") {
    return (
      <p className={["chat-alerts-link", "chat-alerts-link--muted", className].filter(Boolean).join(" ")}>
        {ALERT_FAILURE_COPY.denied}
      </p>
    );
  }

  if (failureReason && ALERT_FAILURE_COPY[failureReason]) {
    return (
      <p className={["chat-alerts-link", "chat-alerts-link--muted", className].filter(Boolean).join(" ")}>
        {ALERT_FAILURE_COPY[failureReason]}
      </p>
    );
  }

  return (
    <button
      type="button"
      className={["chat-alerts-link", className].filter(Boolean).join(" ")}
      onMouseDown={suppressMouseFocus}
      onClick={handleEnable}
      disabled={requesting}
    >
      {requesting ? "Enabling…" : "Get notified when someone messages you"}
    </button>
  );
}
