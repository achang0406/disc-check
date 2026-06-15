import { useCallback, useEffect, useRef, useState } from "react";
import { APP_NAME } from "../../constants/app.js";
import {
  canShowChatPushBell,
  getWebPushSupportState,
  isSubscribedToGroupChatPush,
  subscribeToGroupChatPush,
  unsubscribeFromGroupChatPush,
} from "../../lib/push.js";
import { isIosDevice, isStandaloneDisplay } from "../../utils/pwaInstall.js";

const HINT_PEEK_MS = 3000;

function notifyPushPreferenceChanged(groupId) {
  window.dispatchEvent(new CustomEvent("disc-check-push-changed", { detail: { groupId } }));
}

function deniedStatusLabel() {
  if (isIosDevice() && isStandaloneDisplay()) {
    return `Turn on notifications in Settings → ${APP_NAME}`;
  }
  return "Notifications blocked in browser settings";
}

const STATUS_LABEL = {
  "subscribe-failed": "Could not enable game alerts",
  "sw-not-ready": "Reload the app, then try again",
  "missing-identity": "Loading… try again in a moment",
  misconfigured: "Push notifications are not configured on this build",
  unsupported: "Push notifications are not supported in this browser",
};

function statusMessage(reason) {
  if (!reason) return null;
  if (reason === "denied") return deniedStatusLabel();
  if (reason === "ios-install-required") return `Add ${APP_NAME} to your Home Screen first`;
  return STATUS_LABEL[reason] ?? "Could not enable game alerts";
}

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
  const errorText = statusMessage(errorReason);
  if (errorText) return errorText;
  if (subscribed === null) {
    return "Checking…";
  }
  if (subscribed) {
    return "Game alerts on";
  }
  return "Game alerts off";
}

export default function GroupChatPushButton({ groupId = "", subscriberId = "" }) {
  const [subscribed, setSubscribed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errorReason, setErrorReason] = useState(null);
  const [hovering, setHovering] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const peekTimerRef = useRef(null);
  const buttonRef = useRef(null);
  const pushSupport = getWebPushSupportState();

  const clearPeekTimer = useCallback(() => {
    if (peekTimerRef.current != null) {
      window.clearTimeout(peekTimerRef.current);
      peekTimerRef.current = null;
    }
  }, []);

  const peekHint = useCallback(() => {
    clearPeekTimer();
    setPeeking(true);
    peekTimerRef.current = window.setTimeout(() => {
      setPeeking(false);
      peekTimerRef.current = null;
    }, HINT_PEEK_MS);
  }, [clearPeekTimer]);

  useEffect(() => () => clearPeekTimer(), [clearPeekTimer]);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setSubscribed(false);
      return;
    }
    const active = await isSubscribedToGroupChatPush({ groupId, subscriberId });
    setSubscribed(active);
  }, [groupId, subscriberId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!groupId) {
        if (!cancelled) setSubscribed(false);
        return;
      }
      const active = await isSubscribedToGroupChatPush({ groupId, subscriberId });
      if (!cancelled) setSubscribed(active);
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, subscriberId]);

  if (!canShowChatPushBell()) {
    return null;
  }

  const finishInteraction = useCallback(() => {
    buttonRef.current?.blur();
    peekHint();
  }, [peekHint]);

  const handleClick = async () => {
    if (!groupId || busy || subscribed === null) return;

    if (subscribed) {
      setBusy(true);
      setErrorReason(null);
      try {
        const result = await unsubscribeFromGroupChatPush({ groupId, subscriberId });
        if (result.ok) {
          setSubscribed(false);
          notifyPushPreferenceChanged(groupId);
          finishInteraction();
        } else {
          setErrorReason(result.reason);
          await refresh();
          finishInteraction();
        }
      } catch {
        await refresh();
        finishInteraction();
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!subscriberId) {
      setErrorReason("missing-identity");
      finishInteraction();
      return;
    }

    setBusy(true);
    setErrorReason(null);
    try {
      const result = await subscribeToGroupChatPush({ groupId, subscriberId });
      if (result.ok) {
        setSubscribed(true);
        notifyPushPreferenceChanged(groupId);
        finishInteraction();
      } else {
        const reason = result.reason ?? "subscribe-failed";
        setErrorReason(reason);
        setSubscribed(false);
        finishInteraction();
      }
    } finally {
      setBusy(false);
    }
  };

  const label = subscribed
    ? "Turn off game alerts"
    : errorReason || pushSupport.reason
      ? statusMessage(errorReason || pushSupport.reason) || "Get game alerts"
      : subscribed === null
        ? "Checking notification status…"
        : "Get game alerts";

  const hint = getHintText({ subscribed, errorReason });
  const showStatus = Boolean(errorReason) || hovering || peeking;
  const hintId = `group-chat-push-hint-${groupId}`;

  return (
    <div
      className={[
        "game-chat-push",
        subscribed ? "game-chat-push--on" : "",
        errorReason ? "game-chat-push--error" : "",
        showStatus ? "game-chat-push--hint-visible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        ref={buttonRef}
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
        aria-describedby={showStatus ? hintId : undefined}
      >
        <ChatBellIcon active={Boolean(subscribed)} />
      </button>
      {showStatus ? (
        <p id={hintId} className="game-chat-push__hint" role={errorReason ? "alert" : "status"}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
