import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MAX_CHAT_LENGTH } from "../../constants/presence.js";
import { getPortalTarget } from "../../utils/portalTarget.js";
import ChatAlertsLink from "./ChatAlertsLink.jsx";

/** Inset between layout viewport bottom and visual viewport bottom (Safari chrome or keyboard). */
function getViewportBottomInset(viewport) {
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

const KEYBOARD_INSET_MIN = 150;
const SAFARI_CHROME_INSET_MAX = 140;

export default function ChatBar({
  inputRef,
  value,
  onChange,
  onSend,
  connected,
  isWide = false,
  showAlertsToggle = false,
  gameId = "",
  subscriberId = "",
}) {
  const anchorRef = useRef(null);
  const inputFocusedRef = useRef(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    const root = document.documentElement;

    const clearChatBarVars = () => {
      root.style.removeProperty("--chat-bar-height");
      root.style.removeProperty("--chat-bar-lift");
      root.style.removeProperty("--chat-bar-bottom");
      root.style.removeProperty("--chat-bar-offset-left");
      root.style.removeProperty("--chat-bar-offset-right");
    };

    if (!anchor) return undefined;

    if (isWide) {
      clearChatBarVars();
      return undefined;
    }

    const syncHeight = () => {
      const measured = anchor.getBoundingClientRect().height;
      const height = Math.ceil(Math.max(measured, anchor.offsetHeight));
      root.style.setProperty("--chat-bar-height", `${height}px`);
    };

    const syncOffsets = () => {
      const field = anchor.querySelector(".chat-bar__field");
      if (!field) return;

      const rect = field.getBoundingClientRect();
      root.style.setProperty("--chat-bar-offset-left", `${rect.left}px`);
      root.style.setProperty("--chat-bar-offset-right", `${window.innerWidth - rect.right}px`);
    };

    const viewport = window.visualViewport;
    const update = () => {
      syncHeight();
      syncOffsets();

      if (!viewport) {
        root.style.setProperty("--chat-bar-lift", "0px");
        root.style.setProperty("--chat-bar-bottom", "0px");
        return;
      }

      const inset = getViewportBottomInset(viewport);
      const keyboardOpen =
        inputFocusedRef.current && inset >= KEYBOARD_INSET_MIN;
      const safariChrome =
        !keyboardOpen && inset > 0 && inset < SAFARI_CHROME_INSET_MAX;

      if (keyboardOpen || safariChrome) {
        root.style.setProperty("--chat-bar-bottom", `${inset}px`);
      } else {
        root.style.setProperty("--chat-bar-bottom", "0px");
      }

      root.style.setProperty("--chat-bar-lift", keyboardOpen ? `${inset}px` : "0px");
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(anchor);
    const field = anchor.querySelector(".chat-bar__field");
    if (field) {
      resizeObserver.observe(field);
    }

    const input = anchor.querySelector(".chat-bar__input");
    const handleFocus = () => {
      inputFocusedRef.current = true;
      update();
    };
    const handleBlur = () => {
      inputFocusedRef.current = false;
      requestAnimationFrame(update);
    };

    window.addEventListener("resize", update);
    if (input) {
      input.addEventListener("focus", handleFocus);
      input.addEventListener("blur", handleBlur);
    }
    if (viewport) {
      viewport.addEventListener("resize", update);
      viewport.addEventListener("scroll", update);
    }

    update();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      if (input) {
        input.removeEventListener("focus", handleFocus);
        input.removeEventListener("blur", handleBlur);
      }
      if (viewport) {
        viewport.removeEventListener("resize", update);
        viewport.removeEventListener("scroll", update);
      }
      clearChatBarVars();
    };
  }, [isWide]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  const chatBar = (
    <div ref={anchorRef} className="chat-bar-anchor chat-bar-anchor--detail">
      <div className="chat-bar-stack">
        {showAlertsToggle ? (
          <ChatAlertsLink gameId={gameId} subscriberId={subscriberId} />
        ) : null}
        <form className="chat-bar composer-row" onSubmit={handleSubmit}>
          <div className="composer-field chat-bar__field">
            <input
              ref={inputRef}
              className="composer-field__input chat-bar__input"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={
                connected
                  ? isWide
                    ? "Type anywhere, or here…"
                    : "Say something…"
                  : "Connecting…"
              }
              disabled={!connected}
              maxLength={MAX_CHAT_LENGTH}
              enterKeyHint="send"
              autoComplete="off"
            />
            <button
              type="submit"
              className="composer-field__submit chat-bar__send"
              disabled={!connected || !value.trim()}
              aria-label="Send message"
              title="Send message"
            >
              →
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!portalTarget) return null;

  return createPortal(chatBar, portalTarget);
}
