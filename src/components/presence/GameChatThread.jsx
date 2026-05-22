import { useEffect, useRef } from "react";
import { MQ_WIDE } from "../../constants/breakpoints.js";

function ChatBubble({ message, selfId }) {
  const isSelf = message.senderId === selfId;

  return (
    <div className={`chat-message${isSelf ? " chat-message--self" : ""}`}>
      {!isSelf && <span className="chat-message__name">{message.name}</span>}
      <div
        className="chat-message__bubble"
        style={
          isSelf
            ? { background: message.color, borderColor: message.color }
            : undefined
        }
      >
        {message.text}
      </div>
    </div>
  );
}

export default function GameChatThread({ messages, selfId }) {
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickToBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const thread = scrollRef.current;
    const root = document.documentElement;
    const media = window.matchMedia(MQ_WIDE);

    const clearThreadPad = () => {
      root.style.removeProperty("--chat-thread-pad-left");
      root.style.removeProperty("--chat-thread-pad-right");
    };

    if (!thread) return undefined;

    const syncThreadPadding = () => {
      if (media.matches) {
        clearThreadPad();
        return;
      }

      const input = document.querySelector(".chat-bar__input");
      if (!input) return;

      const threadRect = thread.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();

      root.style.setProperty(
        "--chat-thread-pad-left",
        `${Math.max(0, inputRect.left - threadRect.left)}px`,
      );
      root.style.setProperty(
        "--chat-thread-pad-right",
        `${Math.max(0, threadRect.right - inputRect.right)}px`,
      );
    };

    const resizeObserver = new ResizeObserver(syncThreadPadding);
    resizeObserver.observe(thread);

    const input = document.querySelector(".chat-bar__input");
    if (input) {
      resizeObserver.observe(input);
    }

    window.addEventListener("resize", syncThreadPadding);
    media.addEventListener("change", syncThreadPadding);

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", syncThreadPadding);
      viewport.addEventListener("scroll", syncThreadPadding);
    }

    syncThreadPadding();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncThreadPadding);
      media.removeEventListener("change", syncThreadPadding);
      if (viewport) {
        viewport.removeEventListener("resize", syncThreadPadding);
        viewport.removeEventListener("scroll", syncThreadPadding);
      }
      clearThreadPad();
    };
  }, []);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  };

  return (
    <div
      ref={scrollRef}
      className="game-detail-layout__thread"
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 ? (
        <p className="game-chat-thread__empty">Say hi — chat helps get a game going.</p>
      ) : (
        messages.map((message) => (
          <ChatBubble key={message.id} message={message} selfId={selfId} />
        ))
      )}
    </div>
  );
}
