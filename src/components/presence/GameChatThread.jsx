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
  requestAnimationFrame(() => {
    if (distanceFromLatest(node) > 2) {
      node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
    }
  });
}

function smoothScrollToLatest(node) {
  if (!node || !isThreadScrollable(node)) return;

  const maxScroll = Math.max(0, node.scrollHeight - node.clientHeight);
  const reversed = getComputedStyle(node).flexDirection.includes("reverse");

  if (!reversed) {
    node.scrollTo({ top: maxScroll, behavior: "smooth" });
    return;
  }

  node.scrollTo({ top: 0, behavior: "smooth" });

  const finish = () => {
    if (distanceFromLatest(node) > 2) {
      node.scrollTo({ top: maxScroll, behavior: "smooth" });
    }
  };

  if ("onscrollend" in window) {
    node.addEventListener("scrollend", finish, { once: true });
  } else {
    window.setTimeout(finish, 400);
  }
}

function isThreadScrollable(node) {
  return node.scrollHeight > node.clientHeight + 2;
}

function distanceFromLatest(thread) {
  if (!thread) return 0;
  const maxScroll = Math.max(0, thread.scrollHeight - thread.clientHeight);
  if (maxScroll <= 2) return 0;

  const reversed = getComputedStyle(thread).flexDirection.includes("reverse");
  if (!reversed) {
    return maxScroll - thread.scrollTop;
  }

  // column-reverse: Chrome uses scrollTop 0 at latest and negative when scrolled up;
  // WebKit may anchor at maxScroll instead — take whichever edge is closer.
  return Math.min(Math.abs(thread.scrollTop), Math.abs(maxScroll - thread.scrollTop));
}

function isAtLatestScroll(thread) {
  return distanceFromLatest(thread) <= 2;
}

export default function GameChatThread({ messages, selfId, loading = false }) {
  const scrollRef = useRef(null);
  const latestAnchorRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [hasPendingNew, setHasPendingNew] = useState(false);

  const goToLatest = useCallback(({ smooth = false } = {}) => {
    const node = scrollRef.current;
    const anchor = latestAnchorRef.current;

    if (smooth) {
      anchor?.scrollIntoView({ block: "end", behavior: "smooth" });
      smoothScrollToLatest(node);
      return;
    }

    if (node && isThreadScrollable(node)) {
      scrollToLatest(node);
    }

    anchor?.scrollIntoView({ block: "end", behavior: "auto" });
    requestAnimationFrame(() => {
      if (node) scrollToLatest(node);
    });
  }, []);

  const jumpToLatest = useCallback(() => {
    goToLatest({ smooth: true });
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
    const thread = scrollRef.current;

    if (!thread || messages.length === 0) {
      setShowJumpToBottom(false);
      return undefined;
    }

    const syncJumpVisibility = () => {
      if (!isThreadScrollable(thread)) {
        stickToBottomRef.current = true;
        setShowJumpToBottom(false);
        setHasPendingNew(false);
        return;
      }

      const atLatest = isAtLatestScroll(thread);
      stickToBottomRef.current = atLatest;
      setShowJumpToBottom(distanceFromLatest(thread) > 2);

      if (atLatest) {
        setHasPendingNew(false);
      }
    };

    thread.addEventListener("scroll", syncJumpVisibility, { passive: true });
    thread.addEventListener("scrollend", syncJumpVisibility, { passive: true });

    const threadObserver = new ResizeObserver(syncJumpVisibility);
    threadObserver.observe(thread);

    syncJumpVisibility();
    requestAnimationFrame(syncJumpVisibility);

    return () => {
      threadObserver.disconnect();
      thread.removeEventListener("scroll", syncJumpVisibility);
      thread.removeEventListener("scrollend", syncJumpVisibility);
    };
  }, [messages.length, messages[messages.length - 1]?.id]);

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
