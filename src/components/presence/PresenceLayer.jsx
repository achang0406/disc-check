import { useEffect, useState } from "react";
import { CURSOR_IDLE_MS } from "../../constants/presence.js";
import { isSupabaseConfigured } from "../../lib/supabase.js";

function isUserIdle(user) {
  const now = Date.now();
  const hasActiveChat = user.chat && user.chat.expiresAt > now;
  const hasDraft = Boolean(user.draft);
  if (hasActiveChat || hasDraft) return false;
  return now - (user.lastActiveAt || 0) >= CURSOR_IDLE_MS;
}

function CursorPointer({ color, idle }) {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      style={{ display: "block", opacity: idle ? 0.45 : 1 }}
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

function TypingIndicator() {
  return (
    <div className="typing-indicator" aria-label="typing">
      <span />
      <span />
      <span />
    </div>
  );
}

function SpeechBubble({ message, color, isDraft, typingOnly, expiresAt }) {
  const remaining = expiresAt ? expiresAt - Date.now() : null;
  const fadeOpacity = remaining != null && remaining < 400 ? Math.max(0, remaining / 400) : 1;
  const draftStyle = isDraft || typingOnly;

  return (
    <div
      style={{
        marginTop: 6,
        marginLeft: 10,
        maxWidth: 220,
        padding: "8px 12px",
        borderRadius: 10,
        background: draftStyle ? "var(--card-bg)" : color,
        border: `1px solid ${draftStyle ? "var(--card-ring)" : color}`,
        color: draftStyle ? "var(--text-subtle)" : "#0a0a0a",
        fontSize: 13,
        lineHeight: 1.4,
        fontFamily: "'DM Sans',sans-serif",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        wordBreak: "break-word",
        opacity: draftStyle ? 0.92 : fadeOpacity,
        animation: draftStyle ? undefined : "presenceFadeIn 0.15s ease",
        transition: "opacity 0.2s ease",
      }}
    >
      {typingOnly ? <TypingIndicator /> : message}
    </div>
  );
}

function RemoteCursor({ user }) {
  const left = `${user.x * 100}vw`;
  const top = `${user.y * 100}vh`;
  const activeChat = user.chat && user.chat.expiresAt > Date.now() ? user.chat.message : null;
  const activeDraft = !activeChat && user.draft ? user.draft : null;
  const idle = isUserIdle(user);

  return (
    <div
      className={`presence-cursor${idle ? " presence-cursor--idle" : ""}`}
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 150,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
        transition: idle ? "opacity 0.4s ease" : "left 80ms linear, top 80ms linear, opacity 0.4s ease",
      }}
    >
      <CursorPointer color={user.color} idle={idle} />
      <div
        className="presence-cursor__name"
        style={{
          marginTop: 2,
          marginLeft: 12,
          fontSize: 11,
          fontWeight: 600,
          color: user.color,
          fontFamily: "'DM Mono',monospace",
          whiteSpace: "nowrap",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        {user.name}
      </div>
      {activeDraft && <SpeechBubble color={user.color} typingOnly />}
      {activeChat && (
        <SpeechBubble message={activeChat} color={user.color} expiresAt={user.chat.expiresAt} />
      )}
    </div>
  );
}

function LocalPresence({ self, cursor, draft, localChat }) {
  const left = `${cursor.x * 100}vw`;
  const top = `${cursor.y * 100}vh`;
  const showDraft = draft.length > 0;
  const showChat = localChat && localChat.expiresAt > Date.now();

  if (!showDraft && !showChat) return null;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 151,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
      }}
    >
      {showDraft && (
        <>
          <CursorPointer color={self.color} />
          <SpeechBubble message={draft} color={self.color} isDraft />
          <div
            style={{
              marginTop: 4,
              marginLeft: 10,
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "'DM Mono',monospace",
            }}
          >
            press enter to send
          </div>
        </>
      )}
      {showChat && !showDraft && (
        <>
          <CursorPointer color={self.color} />
          <SpeechBubble message={localChat.message} color={self.color} expiresAt={localChat.expiresAt} />
        </>
      )}
    </div>
  );
}

export default function PresenceLayer({ others, self, cursor, draft, localChat, connected }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes presenceFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes presenceIdlePulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.55; }
        }
        .presence-cursor--idle {
          opacity: 0.45;
          animation: presenceIdlePulse 2.5s ease-in-out infinite;
        }
        .presence-cursor--idle .presence-cursor__name {
          opacity: 0.6;
          font-style: italic;
          font-weight: 500;
        }
        .typing-indicator {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 4px;
          min-width: 36px;
          min-height: 14px;
        }
        .typing-indicator span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: typingBounce 1.1s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.3s; }
      `}</style>

      {!connected && isSupabaseConfigured() && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 149,
            pointerEvents: "none",
            fontSize: 11,
            color: "#555",
            fontFamily: "'DM Mono',monospace",
            background: "rgba(10,10,10,0.85)",
            border: "1px solid #1e1e1e",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          connecting to presence…
        </div>
      )}

      {others.map((user) => (
        <RemoteCursor key={user.id} user={user} />
      ))}

      <LocalPresence self={self} cursor={cursor} draft={draft} localChat={localChat} />
    </>
  );
}
