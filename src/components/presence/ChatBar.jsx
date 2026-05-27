import { useEffect, useRef } from "react";
import { MAX_CHAT_LENGTH } from "../../constants/presence.js";
import ChatAlertsLink from "./ChatAlertsLink.jsx";

export default function ChatBar({
  inputRef,
  value,
  onChange,
  onSend,
  connected,
  isWide = false,
  showAlertsToggle = false,
}) {
  const anchorRef = useRef(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const root = document.documentElement;

    const clearChatBarVars = () => {
      root.style.removeProperty("--chat-bar-height");
      root.style.removeProperty("--chat-bar-lift");
      root.style.removeProperty("--chat-bar-offset-left");
      root.style.removeProperty("--chat-bar-offset-right");
    };

    if (!anchor) return undefined;

    if (isWide) {
      anchor.style.transform = "";
      clearChatBarVars();
      return undefined;
    }

    const syncHeight = () => {
      root.style.setProperty("--chat-bar-height", `${anchor.offsetHeight}px`);
    };

    const syncOffsets = () => {
      const input = anchor.querySelector(".chat-bar__input");
      if (!input) return;

      const rect = input.getBoundingClientRect();
      root.style.setProperty("--chat-bar-offset-left", `${rect.left}px`);
      root.style.setProperty("--chat-bar-offset-right", `${window.innerWidth - rect.right}px`);
    };

    const viewport = window.visualViewport;
    const update = () => {
      syncHeight();
      syncOffsets();
      if (!viewport) {
        root.style.setProperty("--chat-bar-lift", "0px");
        anchor.style.transform = "";
        return;
      }

      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty("--chat-bar-lift", `${keyboardOffset}px`);
      anchor.style.transform = keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : "";
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(anchor);
    const input = anchor.querySelector(".chat-bar__input");
    if (input) {
      resizeObserver.observe(input);
    }

    window.addEventListener("resize", update);
    if (viewport) {
      viewport.addEventListener("resize", update);
      viewport.addEventListener("scroll", update);
    }

    update();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      if (viewport) {
        viewport.removeEventListener("resize", update);
        viewport.removeEventListener("scroll", update);
      }
      anchor.style.transform = "";
      clearChatBarVars();
    };
  }, [isWide]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  return (
    <div ref={anchorRef} className="chat-bar-anchor chat-bar-anchor--detail">
      <div className="chat-bar-stack">
        {showAlertsToggle ? <ChatAlertsLink /> : null}
        <form className="chat-bar composer-row" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="composer-row__input chat-bar__input"
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
            className="composer-row__submit chat-bar__send"
            disabled={!connected || !value.trim()}
            aria-label="Send message"
            title="Send message"
          >
            →
          </button>
        </form>
      </div>
    </div>
  );
}
