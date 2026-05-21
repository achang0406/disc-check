import { useEffect, useRef } from "react";
import { MAX_CHAT_LENGTH } from "../../constants/presence.js";

export default function MobileChatBar({ inputRef, value, onChange, onSend, connected }) {
  const anchorRef = useRef(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const anchor = anchorRef.current;
    if (!viewport || !anchor) return undefined;

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
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  return (
    <div ref={anchorRef} className="chat-bar-anchor">
      <form className="mobile-chat-bar" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="mobile-chat-bar__input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={connected ? "Say something…" : "Connecting…"}
          disabled={!connected}
          maxLength={MAX_CHAT_LENGTH}
          enterKeyHint="send"
          autoComplete="off"
        />
        <button
          type="submit"
          className="mobile-chat-bar__send"
          disabled={!connected || !value.trim()}
          aria-label="Send message"
        >
          →
        </button>
      </form>
    </div>
  );
}
