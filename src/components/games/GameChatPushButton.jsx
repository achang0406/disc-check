import { useCallback, useEffect, useState } from "react";
import {
  canShowChatPushBell,
  getWebPushSupportState,
  isSubscribedToGameChatPush,
  subscribeToGameChatPush,
  unsubscribeFromGameChatPush,
} from "../../lib/push.js";

const STATUS_LABEL = {
  denied: "Notifications blocked in browser settings",
  "subscribe-failed": "Could not enable chat notifications",
  "missing-identity": "Loading… try again in a moment",
  misconfigured: "Push notifications are not configured on this build",
  unsupported: "Push notifications are not supported in this browser",
};

function ChatBellIcon({ active = false }) {
  if (active) {
    return (
      <svg className="game-chat-push__icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
        />
      </svg>
    );
  }

  return (
    <svg className="game-chat-push__icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
      />
    </svg>
  );
}

function getHintText({ subscribed, errorReason }) {
  if (errorReason && STATUS_LABEL[errorReason]) {
    return STATUS_LABEL[errorReason];
  }
  if (subscribed === null) {
    return "Checking chat alerts…";
  }
  if (subscribed) {
    return "Chat alerts on — you'll be notified about new messages.";
  }
  return "Chat alerts off — tap the bell to get notified.";
}

export default function GameChatPushButton({ gameId = "", subscriberId = "" }) {
  const [subscribed, setSubscribed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errorReason, setErrorReason] = useState(null);
  const pushSupport = getWebPushSupportState();

  const refresh = useCallback(async () => {
    if (!gameId) {
      setSubscribed(false);
      return;
    }
    const active = await isSubscribedToGameChatPush({ gameId, subscriberId });
    setSubscribed(active);
  }, [gameId, subscriberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!gameId) {
        if (!cancelled) setSubscribed(false);
        return;
      }
      const active = await isSubscribedToGameChatPush({ gameId, subscriberId });
      if (!cancelled) setSubscribed(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, subscriberId]);

  if (!canShowChatPushBell()) {
    return null;
  }

  const handleClick = async () => {
    if (!gameId || busy || subscribed === null) return;

    if (subscribed) {
      setBusy(true);
      setSubscribed(false);
      setErrorReason(null);
      try {
        await unsubscribeFromGameChatPush({ gameId, subscriberId });
      } catch {
        await refresh();
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!subscriberId) {
      setErrorReason("missing-identity");
      return;
    }

    setBusy(true);
    setErrorReason(null);
    try {
      const result = await subscribeToGameChatPush({ gameId, subscriberId });
      if (result.ok) {
        setSubscribed(true);
      } else {
        setErrorReason(result.reason);
        setSubscribed(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const label = subscribed
    ? "Turn off chat notifications"
    : errorReason || pushSupport.reason
      ? STATUS_LABEL[errorReason || pushSupport.reason] || "Get chat notifications"
      : subscribed === null
        ? "Checking notification status…"
        : "Get chat notifications";

  const hint = getHintText({ subscribed, errorReason });

  return (
    <div className={["game-chat-push", subscribed ? "game-chat-push--on" : ""].filter(Boolean).join(" ")}>
      <p className="game-chat-push__hint">{hint}</p>
      <button
        type="button"
        className={[
          "game-chat-push__icon-btn",
          subscribed ? "game-chat-push__icon-btn--on" : "",
          busy ? "game-chat-push__icon-btn--loading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={handleClick}
        disabled={busy || subscribed === null}
        aria-label={label}
        aria-pressed={Boolean(subscribed)}
        title={label}
      >
        <ChatBellIcon active={Boolean(subscribed)} />
      </button>
    </div>
  );
}
