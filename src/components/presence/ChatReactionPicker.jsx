import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CHAT_REACTION_EMOJIS } from "../../constants/chatReactions.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

const PICKER_ROW_HEIGHT = 52;
const PICKER_GAP = 10;
const PICKER_VISIBLE_WIDTH = 212;

export default function ChatReactionPicker({ target, onSelect, onClose }) {
  useEffect(() => {
    if (!target) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const onScroll = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".chat-reaction-picker")) {
        return;
      }
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [target, onClose]);

  if (!target) return null;

  const { rect, message, isSelf } = target;
  const pickerWidth = Math.min(PICKER_VISIBLE_WIDTH, window.innerWidth - 16);
  const pickerLeft = Math.min(
    Math.max(8, rect.left + rect.width / 2 - pickerWidth / 2),
    window.innerWidth - pickerWidth - 8,
  );
  const pickerTop = Math.max(8, rect.top - PICKER_ROW_HEIGHT - PICKER_GAP);

  const handleSelect = (emoji) => {
    onSelect(emoji);
    onClose();
  };

  const stopOverlayClose = (event) => {
    event.stopPropagation();
  };

  return createPortal(
    <div
      className="chat-reaction-overlay"
      role="presentation"
      onPointerDown={onClose}
    >
      <div
        className={`chat-reaction-spotlight${isSelf ? " chat-message--self" : ""}`}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        onPointerDown={stopOverlayClose}
        aria-hidden="true"
      >
        <div className="chat-message__bubble chat-reaction-spotlight__bubble">
          {message.text}
        </div>
      </div>

      <div
        className="chat-reaction-picker"
        style={{
          top: pickerTop,
          left: pickerLeft,
          width: pickerWidth,
        }}
        role="toolbar"
        aria-label="React to message"
        onPointerDown={stopOverlayClose}
      >
        <div className="chat-reaction-picker__scroll">
          {CHAT_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="chat-reaction-picker__btn"
              onMouseDown={suppressMouseFocus}
              onClick={() => handleSelect(emoji)}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
