import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MQ_WIDE } from "../../constants/breakpoints.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

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

function scrollToLatest(node) {
  if (!node) return;
  node.scrollTop = 0;
}

export default function GameChatThread({ messages, selfId }) {
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? !window.matchMedia(MQ_WIDE).matches : false,
  );

  const jumpToLatest = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    scrollToLatest(node);
    stickToBottomRef.current = true;
    setShowJumpToBottom(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia(MQ_WIDE);
    const update = () => setIsCompact(!media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || messages.length === 0) {
      prevMessageCountRef.current = messages.length;
      return;
    }

    const prevCount = prevMessageCountRef.current;
    const hasNewMessages = messages.length > prevCount;
    const lastMessage = messages[messages.length - 1];
    const sentBySelf = hasNewMessages && lastMessage?.senderId === selfId;

    if (sentBySelf || stickToBottomRef.current) {
      scrollToLatest(node);
      requestAnimationFrame(() => scrollToLatest(node));
      stickToBottomRef.current = true;
      setShowJumpToBottom(false);
    } else if (hasNewMessages && isCompact) {
      setShowJumpToBottom(true);
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, selfId, isCompact]);

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

      if (thread.querySelector(".game-chat-thread__empty")) {
        clearThreadPad();
        return;
      }

      const field = document.querySelector(".chat-bar__field");
      if (!field) return;

      const threadRect = thread.getBoundingClientRect();
      const inputRect = field.getBoundingClientRect();

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

    const field = document.querySelector(".chat-bar__field");
    if (field) {
      resizeObserver.observe(field);
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
  }, [messages.length]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;

    const atLatest = node.scrollTop < 48;
    stickToBottomRef.current = atLatest;

    if (atLatest) {
      setShowJumpToBottom(false);
    }
  };

  return (
    <div className="game-chat-thread-shell">
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
          [...messages].reverse().map((message) => (
            <ChatBubble key={message.id} message={message} selfId={selfId} />
          ))
        )}
      </div>

      {isCompact && showJumpToBottom && (
        <button
          type="button"
          className="game-chat-thread__jump"
          onMouseDown={suppressMouseFocus}
          onClick={jumpToLatest}
          aria-label="Jump to latest messages"
        >
          New messages ↓
        </button>
      )}
    </div>
  );
}
