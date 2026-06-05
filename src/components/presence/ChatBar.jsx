import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CHAT_INPUT_PLACEHOLDER, MAX_CHAT_LENGTH } from "../../constants/presence.js";
import { getPortalTarget } from "../../utils/portalTarget.js";
import { isStandaloneDisplay, syncStandaloneRootClass } from "../../utils/pwaInstall.js";

/** Inset between layout viewport bottom and visual viewport bottom (Safari chrome or keyboard). */
function getViewportBottomInset(viewport) {
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

const KEYBOARD_INSET_MIN = 150;
const SAFARI_CHROME_INSET_MAX = 140;

function applyChatBarInsets(root, { standalone, keyboardOpen, safariChrome, inset }) {
  if (keyboardOpen) {
    root.style.setProperty("--chat-bar-bottom", `${inset}px`);
    root.style.setProperty("--chat-bar-pad-bottom", "0px");
    root.style.setProperty("--chat-bar-lift", `${inset}px`);
    return;
  }

  root.style.setProperty("--chat-bar-lift", "0px");

  if (safariChrome) {
    root.style.setProperty("--chat-bar-bottom", `${inset}px`);
    root.style.removeProperty("--chat-bar-pad-bottom");
    return;
  }

  root.style.setProperty("--chat-bar-bottom", "0px");

  if (standalone) {
    root.style.setProperty("--chat-bar-pad-bottom", "env(safe-area-inset-bottom, 0px)");
  } else {
    root.style.removeProperty("--chat-bar-pad-bottom");
  }
}

export default function ChatBar({
  inputRef,
  value,
  onChange,
  onSend,
  connected,
}) {
  const anchorRef = useRef(null);
  const inputFocusedRef = useRef(false);
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
    syncStandaloneRootClass();
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    const root = document.documentElement;

    const clearChatBarVars = () => {
      root.style.removeProperty("--chat-bar-height");
      root.style.removeProperty("--chat-bar-lift");
      root.style.removeProperty("--chat-bar-bottom");
      root.style.removeProperty("--chat-bar-pad-bottom");
      root.style.removeProperty("--chat-bar-offset-left");
      root.style.removeProperty("--chat-bar-offset-right");
    };

    if (!anchor) return undefined;

    const syncHeight = () => {
      const field = anchor.querySelector(".chat-bar__field");
      const anchorStyle = getComputedStyle(anchor);
      const padTop = parseFloat(anchorStyle.paddingTop) || 0;
      const padBottom = parseFloat(anchorStyle.paddingBottom) || 0;
      const fieldHeight = field?.getBoundingClientRect().height ?? anchor.getBoundingClientRect().height;
      const height = Math.ceil(fieldHeight + padTop + padBottom);
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
      syncStandaloneRootClass();
      syncHeight();
      syncOffsets();

      const standalone = isStandaloneDisplay();

      if (!viewport) {
        applyChatBarInsets(root, {
          standalone,
          keyboardOpen: false,
          safariChrome: false,
          inset: 0,
        });
        return;
      }

      const inset = getViewportBottomInset(viewport);
      const keyboardOpen =
        inputFocusedRef.current && inset >= KEYBOARD_INSET_MIN;
      const safariChrome =
        !standalone &&
        !keyboardOpen &&
        inset > 0 &&
        inset < SAFARI_CHROME_INSET_MAX;

      applyChatBarInsets(root, { standalone, keyboardOpen, safariChrome, inset });
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
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  const chatBar = (
    <div ref={anchorRef} className="chat-bar-anchor chat-bar-anchor--detail">
      <div className="chat-bar-stack">
        <form className="chat-bar composer-row" onSubmit={handleSubmit}>
          <div className="composer-field chat-bar__field" data-walkthrough-target="chat-bar">
            <input
              ref={inputRef}
              className="composer-field__input chat-bar__input"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={connected ? CHAT_INPUT_PLACEHOLDER : "Connecting…"}
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
