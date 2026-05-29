import { useCallback, useEffect, useState } from "react";
import {
  getWebPushSupportState,
  isGamePushSubscribed,
  registerChatPushAlerts,
} from "../../lib/push.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function readNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

const FAILURE_COPY = {
  denied: "Notifications are blocked in your browser settings.",
  "subscribe-failed": "Could not enable push alerts. Try again after reloading the app.",
  "missing-identity": "Finish loading this game, then try again.",
};

export default function GameChatPushButton({ gameId = "", subscriberId = "" }) {
  const [permission, setPermission] = useState(readNotificationPermission);
  const [subscribed, setSubscribed] = useState(() => isGamePushSubscribed(gameId));
  const [requesting, setRequesting] = useState(false);
  const [failureReason, setFailureReason] = useState(null);
  const [pushSupport, setPushSupport] = useState(() => getWebPushSupportState());

  useEffect(() => {
    setSubscribed(isGamePushSubscribed(gameId));
  }, [gameId]);

  useEffect(() => {
    const sync = () => {
      setPermission(readNotificationPermission());
      setPushSupport(getWebPushSupportState());
      setSubscribed(isGamePushSubscribed(gameId));
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [gameId]);

  const handleSubscribe = useCallback(async () => {
    setRequesting(true);
    setFailureReason(null);
    try {
      const result = await registerChatPushAlerts({ gameId, subscriberId });
      setPermission(readNotificationPermission());
      if (result.ok) {
        setSubscribed(true);
      } else {
        setFailureReason(result.reason);
      }
    } finally {
      setRequesting(false);
    }
  }, [gameId, subscriberId]);

  if (pushSupport.reason === "ios-install-required") {
    return (
      <div className="game-chat-push">
        <p className="game-chat-push__hint">Add DiscCheck to your Home Screen to receive push notifications.</p>
      </div>
    );
  }

  if (!pushSupport.supported) {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="game-chat-push">
        <p className="game-chat-push__hint">{FAILURE_COPY.denied}</p>
      </div>
    );
  }

  if (failureReason && FAILURE_COPY[failureReason]) {
    return (
      <div className="game-chat-push">
        <p className="game-chat-push__hint">{FAILURE_COPY[failureReason]}</p>
      </div>
    );
  }

  if (subscribed && permission === "granted") {
    return (
      <div className="game-chat-push">
        <p className="game-chat-push__status">Chat notifications on</p>
      </div>
    );
  }

  if (permission === "unsupported") {
    return null;
  }

  return (
    <div className="game-chat-push">
      <button
        type="button"
        className="btn btn--secondary game-chat-push__button"
        onMouseDown={suppressMouseFocus}
        onClick={handleSubscribe}
        disabled={requesting || !gameId || !subscriberId}
      >
        {requesting ? "Enabling…" : "Notify me about chat"}
      </button>
    </div>
  );
}
