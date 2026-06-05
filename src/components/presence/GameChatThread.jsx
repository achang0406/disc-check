import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

function ChatBubble({ message, selfId }) {
  const isSelf = message.senderId === selfId;

  return (
    <div className={`chat-message${isSelf ? " chat-message--self" : ""}`}>
      {!isSelf && <span className="chat-message__name">{message.name}</span>}
      <div className="chat-message__bubble">
        {message.text}
      </div>
    </div>
  );
}

function scrollToLatest(node) {
  if (!node) return;
  node.scrollTop = 0;
}

function isThreadScrollable(node) {
  return node.scrollHeight > node.clientHeight + 2;
}

function getViewportBottomInset() {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const barHeight = parseFloat(style.getPropertyValue("--chat-bar-height")) || 58;
  const lift = parseFloat(style.getPropertyValue("--chat-bar-lift")) || 0;
  const safeBottom = parseFloat(style.getPropertyValue("--safe-area-bottom")) || 0;
  return barHeight + lift + safeBottom + 16;
}

export default function GameChatThread({ messages, selfId, loading = false }) {
  const scrollRef = useRef(null);
  const latestAnchorRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [hasPendingNew, setHasPendingNew] = useState(false);

  const goToLatest = useCallback(() => {
    const node = scrollRef.current;
    const anchor = latestAnchorRef.current;

    if (node && isThreadScrollable(node)) {
      scrollToLatest(node);
    }

    anchor?.scrollIntoView({ block: "end", behavior: "smooth" });
    requestAnimationFrame(() => {
      if (node) scrollToLatest(node);
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    goToLatest();
    stickToBottomRef.current = true;
    setShowJumpToBottom(false);
    setHasPendingNew(false);
  }, [goToLatest]);

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
      goToLatest();
      stickToBottomRef.current = true;
      setShowJumpToBottom(false);
    } else if (hasNewMessages) {
      setShowJumpToBottom(true);
      setHasPendingNew(true);
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, selfId, goToLatest]);

  useLayoutEffect(() => {
    const anchor = latestAnchorRef.current;
    const thread = scrollRef.current;

    if (!anchor || messages.length === 0) {
      setShowJumpToBottom(false);
      return undefined;
    }

    const observeLatest = () => {
      const scrollRoot = thread && isThreadScrollable(thread) ? thread : null;
      const bottomInset = getViewportBottomInset();

      return new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;

          const atLatest = entry.isIntersecting;
          stickToBottomRef.current = atLatest;
          setShowJumpToBottom(!atLatest);

          if (atLatest) {
            setHasPendingNew(false);
          }
        },
        {
          root: scrollRoot,
          rootMargin: scrollRoot ? "0px" : `0px 0px -${bottomInset}px 0px`,
          threshold: 0,
        },
      );
    };

    let observer = observeLatest();
    observer.observe(anchor);

    const threadObserver =
      thread &&
      new ResizeObserver(() => {
        observer.disconnect();
        observer = observeLatest();
        observer.observe(anchor);
      });

    if (thread && threadObserver) {
      threadObserver.observe(thread);
    }

    return () => {
      observer.disconnect();
      threadObserver?.disconnect();
    };
  }, [messages.length, messages[messages.length - 1]?.id]);

  useLayoutEffect(() => {
    const thread = scrollRef.current;
    const root = document.documentElement;

    const clearThreadPad = () => {
      root.style.removeProperty("--chat-thread-pad-left");
      root.style.removeProperty("--chat-thread-pad-right");
    };

    if (!thread) return undefined;

    const syncThreadPadding = () => {
      if (thread.querySelector(".game-chat-thread__empty") || thread.querySelector(".game-chat-thread__loading")) {
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

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", syncThreadPadding);
      viewport.addEventListener("scroll", syncThreadPadding);
    }

    syncThreadPadding();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncThreadPadding);
      if (viewport) {
        viewport.removeEventListener("resize", syncThreadPadding);
        viewport.removeEventListener("scroll", syncThreadPadding);
      }
      clearThreadPad();
    };
  }, [messages.length]);

  return (
    <div className="game-chat-thread-shell">
      <div
        ref={scrollRef}
        className="game-detail-layout__thread"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading ? (
          <p className="game-chat-thread__loading">Loading chat…</p>
        ) : messages.length === 0 ? (
          <p className="game-chat-thread__empty">Say hi — chat helps get a game going.</p>
        ) : (
          <>
            <div
              ref={latestAnchorRef}
              className="game-chat-thread__latest-anchor"
              aria-hidden="true"
            />
            {[...messages].reverse().map((message) => (
              <ChatBubble key={message.id} message={message} selfId={selfId} />
            ))}
          </>
        )}
      </div>

      {showJumpToBottom && (
        <button
          type="button"
          className="game-chat-thread__jump"
          onMouseDown={suppressMouseFocus}
          onClick={jumpToLatest}
          aria-label={
            hasPendingNew ? "Jump to new messages" : "Jump to latest messages"
          }
        >
          {hasPendingNew ? "New messages ↓" : "Latest ↓"}
        </button>
      )}
    </div>
  );
}
