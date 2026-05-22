import { useEffect, useRef } from "react";
import { MAX_CHAT_LENGTH } from "../../constants/presence.js";

export default function ChatBar({ inputRef, value, onChange, onSend, connected, isWide = false }) {
  const anchorRef = useRef(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    if (isWide) {
      anchor.style.transform = "";
      return undefined;
    }

    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const update = () => {
      const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      anchor.style.transform = keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : "";
    };

    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      anchor.style.transform = "";
    };
  }, [isWide]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  return (
    <div ref={anchorRef} className="chat-bar-anchor chat-bar-anchor--detail">
      <form className="chat-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="chat-bar__input"
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
          className="chat-bar__send"
          disabled={!connected || !value.trim()}
          aria-label="Send message"
        >
          →
        </button>
      </form>
    </div>
  );
}
