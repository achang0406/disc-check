import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getBubblePlacement, SPEECH_BUBBLE_WRAP_CH } from "../../constants/presence.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function CursorPointer({ color, glow = false }) {
  const glowFilter = glow
    ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color}88)`
    : undefined;

  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      style={{ display: "block", filter: glowFilter }}
    >
      <path
        d="M1 1L1 16L5.5 11.5L9 19L11.5 18L8 10.5L14 10.5L1 1Z"
        fill={color}
        stroke="#0a0a0a"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function SpeechBubble({ message, color, expiresAt, draft = false, bubbleRef }) {
  const remaining = expiresAt ? expiresAt - Date.now() : null;
  const fadeOpacity = remaining != null && remaining < 400 ? Math.max(0, remaining / 400) : 1;

  return (
    <div
      ref={bubbleRef}
      className={cx("speech-bubble", draft && "speech-bubble--draft")}
      style={{
        background: color,
        border: `1px solid ${color}`,
        color: "#0a0a0a",
        opacity: draft ? 0.85 : fadeOpacity,
      }}
    >
      {message}
    </div>
  );
}

function PresenceCursor({
  x,
  y,
  zIndex,
  color,
  name,
  signedUp,
  self = false,
  chat = null,
}) {
  const nameRef = useRef(null);
  const bubbleRef = useRef(null);
  const [nameWidth, setNameWidth] = useState(0);
  const [bubbleSize, setBubbleSize] = useState(null);
  const hasBubble = Boolean(chat?.message);
  const [displayPos, setDisplayPos] = useState({ x, y });
  const targetRef = useRef({ x, y });
  const displayRef = useRef({ x, y });

  useLayoutEffect(() => {
    targetRef.current = { x, y };

    if (self) {
      displayRef.current = { x, y };
      setDisplayPos({ x, y });
      return undefined;
    }

    let frameId = 0;

    const step = () => {
      const target = targetRef.current;
      const current = displayRef.current;
      const dx = target.x - current.x;
      const dy = target.y - current.y;

      if (Math.abs(dx) < 0.0004 && Math.abs(dy) < 0.0004) {
        if (current.x !== target.x || current.y !== target.y) {
          displayRef.current = target;
          setDisplayPos(target);
        }
        return;
      }

      const next = {
        x: current.x + dx * 0.55,
        y: current.y + dy * 0.55,
      };
      displayRef.current = next;
      setDisplayPos(next);
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [self, x, y]);

  useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) {
      setNameWidth(0);
      return undefined;
    }

    const update = () => setNameWidth(el.offsetWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [name]);

  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (!el) {
      setBubbleSize(null);
      return undefined;
    }

    const update = () => {
      setBubbleSize({ width: el.offsetWidth, height: el.offsetHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [chat?.message]);

  const { flipX, flipY } = getBubblePlacement(displayPos.x, displayPos.y, {
    hasBubble,
    nameWidth,
    bubbleWidth: bubbleSize?.width ?? 0,
    bubbleHeight: bubbleSize?.height ?? 0,
  });

  return (
    <div
      className={cx(
        "presence-cursor",
        self && "presence-cursor--self",
        signedUp && "presence-cursor--rsvp",
      )}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex,
        pointerEvents: "none",
        transform: `translate3d(calc(${displayPos.x * 100}vw - 2px), calc(${displayPos.y * 100}vh - 2px), 0)`,
        willChange: self ? "transform" : undefined,
      }}
    >
      <CursorPointer color={color} glow={signedUp} />
      <div
        className={cx(
          "presence-cursor__stack",
          flipX && "presence-cursor__stack--flip-x",
          flipY && "presence-cursor__stack--flip-y",
        )}
      >
        <div
          ref={nameRef}
          className="presence-cursor__name"
          style={{
            color,
            textShadow: signedUp ? `0 0 8px ${color}` : undefined,
          }}
        >
          {name}
        </div>
        {hasBubble && (
          <SpeechBubble
            bubbleRef={bubbleRef}
            message={chat.message}
            color={color}
            expiresAt={chat.expiresAt}
            draft={chat.draft}
          />
        )}
      </div>
    </div>
  );
}

function RemotePresence({ user, signedUp }) {
  const activeChat = user.chat && user.chat.expiresAt > Date.now() ? user.chat.message : null;

  return (
    <PresenceCursor
      x={user.x}
      y={user.y}
      zIndex={150}
      color={user.color}
      name={user.name}
      signedUp={signedUp}
      chat={activeChat ? { message: activeChat, expiresAt: user.chat.expiresAt } : null}
    />
  );
}

function SelfPresence({ self, cursor, draft, localChat, signedUp }) {
  const sentMessage = localChat && localChat.expiresAt > Date.now() ? localChat.message : null;
  const hasDraft = Boolean(draft.trim());

  let chat = null;
  if (hasDraft) {
    chat = { message: draft, draft: true };
  } else if (sentMessage) {
    chat = { message: sentMessage, expiresAt: localChat.expiresAt };
  }

  return (
    <PresenceCursor
      x={cursor.x}
      y={cursor.y}
      zIndex={151}
      color={self.color}
      name={self.name}
      signedUp={signedUp}
      self
      chat={chat}
    />
  );
}

export default function PresenceLayer({
  others,
  self,
  cursor,
  localChat,
  draft,
  connected,
  isWide,
  rsvpUserIds,
}) {
  const [, setTick] = useState(0);
  const selfSignedUp = rsvpUserIds?.has(self.id) ?? false;

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="presence-layer presence-layer--wide-only">
      <style>{`
        @keyframes presenceFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes presenceFadeInUp {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .presence-cursor__stack {
          position: absolute;
          top: 16px;
          left: 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: max-content;
        }
        .presence-cursor__stack--flip-x {
          left: auto;
          right: 10px;
          align-items: flex-end;
        }
        .presence-cursor__stack--flip-y {
          top: auto;
          bottom: 16px;
          flex-direction: column-reverse;
        }
        .speech-bubble {
          margin-top: 6px;
          display: inline-block;
          width: max-content;
          max-width: ${SPEECH_BUBBLE_WRAP_CH}ch;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.4;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          word-break: break-word;
          transition: opacity 0.2s ease;
          animation: presenceFadeIn 0.15s ease;
        }
        .presence-cursor__stack--flip-y .speech-bubble {
          margin-top: 0;
          margin-bottom: 6px;
          animation: presenceFadeInUp 0.15s ease;
        }
        .presence-cursor__stack--flip-y .presence-cursor__name {
          margin-top: 0;
          margin-bottom: 2px;
        }
        .presence-cursor__name {
          margin-top: 2px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
      `}</style>

      {!connected && isSupabaseConfigured() && isWide && (
        <div className="presence-connecting">Connecting to presence…</div>
      )}

      {others.map((user) => (
        <RemotePresence
          key={user.id}
          user={user}
          signedUp={rsvpUserIds?.has(user.id) ?? false}
        />
      ))}

      {connected && isWide && (
        <SelfPresence
          self={self}
          cursor={cursor}
          draft={draft}
          localChat={localChat}
          signedUp={selfSignedUp}
        />
      )}
    </div>
  );
}
