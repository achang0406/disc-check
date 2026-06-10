import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";
import ChatReactionPicker from "./ChatReactionPicker.jsx";
import ChatReactionStrip from "./ChatReactionStrip.jsx";

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 8;

function reactionsEqual(left, right) {
  if (left === right) return true;
  if (!left?.length && !right?.length) return true;
  if (!left?.length || !right?.length || left.length !== right.length) return false;

  return left.every((entry, index) => {
    const other = right[index];
    return entry.reactorId === other.reactorId && entry.emoji === other.emoji;
  });
}

const ChatBubble = memo(function ChatBubble({
  message,
  selfId,
  reactions,
  onToggleReaction,
  onOpenPicker,
  isSpotlightSource = false,
}) {
  const isSelf = message.senderId === selfId;
  const pressTimerRef = useRef(null);
  const pressOriginRef = useRef(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current != null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressOriginRef.current = null;
  }, []);

  const openPicker = useCallback(
    (target) => {
      if (!(target instanceof HTMLElement)) return;
      onOpenPicker(message.id, target.getBoundingClientRect());
    },
    [message.id, onOpenPicker],
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;

      pressOriginRef.current = { x: event.clientX, y: event.clientY };
      clearPressTimer();

      const target = event.currentTarget;
      pressTimerRef.current = window.setTimeout(() => {
        pressTimerRef.current = null;
        openPicker(target);
      }, LONG_PRESS_MS);
    },
    [clearPressTimer, openPicker],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!pressOriginRef.current || pressTimerRef.current == null) return;

      const dx = event.clientX - pressOriginRef.current.x;
      const dy = event.clientY - pressOriginRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearPressTimer();
      }
    },
    [clearPressTimer],
  );

  const handleContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      openPicker(event.currentTarget);
    },
    [openPicker],
  );

  useEffect(() => () => clearPressTimer(), [clearPressTimer]);

  return (
    <div className={`chat-message${isSelf ? " chat-message--self" : ""}`}>
      {!isSelf && <span className="chat-message__name">{message.name}</span>}
      <div className="chat-message__bubble-wrap">
        <div
          className={`chat-message__bubble${
            isSpotlightSource ? " chat-message__bubble--spotlight-source" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={clearPressTimer}
          onPointerCancel={clearPressTimer}
          onContextMenu={handleContextMenu}
        >
          {message.text}
        </div>
        <ChatReactionStrip
          reactions={reactions}
          selfId={selfId}
          onToggleReaction={(emoji) => onToggleReaction(message.id, emoji)}
        />
      </div>
    </div>
  );
}, (prev, next) => (
  prev.message.id === next.message.id &&
  prev.message.text === next.message.text &&
  prev.message.senderId === next.message.senderId &&
  prev.selfId === next.selfId &&
  prev.isSpotlightSource === next.isSpotlightSource &&
  reactionsEqual(prev.reactions, next.reactions)
));

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
    return Math.max(0, maxScroll - thread.scrollTop);
  }

  const scrollTop = thread.scrollTop;

  if (scrollTop > maxScroll + 2) return 0;

  const newest = thread.querySelector(".chat-message");
  if (newest) {
    const threadRect = thread.getBoundingClientRect();
    const msgRect = newest.getBoundingClientRect();
    const beyondBottom = msgRect.bottom - threadRect.bottom;
    if (beyondBottom <= 2) return 0;
    return beyondBottom;
  }

  if (scrollTop >= 0) return 0;
  return Math.abs(scrollTop);
}

function isAtLatestScroll(thread) {
  return distanceFromLatest(thread) <= 2;
}

export default function GameChatThread({
  messages,
  selfId,
  reactionsByMessageId = {},
  onToggleReaction,
  loading = false,
}) {
  const scrollRef = useRef(null);
  const latestAnchorRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [hasPendingNew, setHasPendingNew] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const closePicker = useCallback(() => {
    setPickerTarget(null);
  }, []);

  const handleOpenPicker = useCallback(
    (messageId, rect) => {
      const message = messages.find((entry) => entry.id === messageId);
      if (!message || !rect) return;

      setPickerTarget({
        messageId,
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        message,
        isSelf: message.senderId === selfId,
      });
    },
    [messages, selfId],
  );

  const handlePickerSelect = useCallback(
    (emoji) => {
      if (pickerTarget?.messageId && onToggleReaction) {
        onToggleReaction(pickerTarget.messageId, emoji);
      }
    },
    [onToggleReaction, pickerTarget?.messageId],
  );

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

  const messageIdSet = new Set(messages.map((message) => message.id));

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
            {[...messages].reverse().map((message) => {
              if (!messageIdSet.has(message.id)) return null;

              return (
                <ChatBubble
                  key={message.id}
                  message={message}
                  selfId={selfId}
                  reactions={reactionsByMessageId[message.id] ?? []}
                  onToggleReaction={onToggleReaction}
                  onOpenPicker={handleOpenPicker}
                  isSpotlightSource={pickerTarget?.messageId === message.id}
                />
              );
            })}
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

      <ChatReactionPicker
        target={pickerTarget}
        onSelect={handlePickerSelect}
        onClose={closePicker}
      />
    </div>
  );
}
