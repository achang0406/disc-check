import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase.js";

function CursorPointer({ color }) {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" style={{ display: "block" }}>
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
      className="speech-bubble"
      style={{
        background: draftStyle ? "var(--card-bg)" : color,
        border: `1px solid ${draftStyle ? "var(--card-ring)" : color}`,
        color: draftStyle ? "var(--text-subtle)" : "#0a0a0a",
        opacity: draftStyle ? 0.92 : fadeOpacity,
        animation: draftStyle ? undefined : "presenceFadeIn 0.15s ease",
      }}
    >
      {typingOnly ? <TypingIndicator /> : message}
    </div>
  );
}

function RemotePresence({ user }) {
  const activeChat = user.chat && user.chat.expiresAt > Date.now() ? user.chat.message : null;
  const activeDraft = !activeChat && user.draft ? user.draft : null;

  return (
    <div
      className="presence-cursor"
      style={{
        position: "fixed",
        left: `${user.x * 100}vw`,
        top: `${user.y * 100}vh`,
        zIndex: 150,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
        transition: "left 80ms linear, top 80ms linear",
      }}
    >
      <CursorPointer color={user.color} />
      <div className="presence-cursor__name" style={{ color: user.color }}>
        {user.name}
      </div>
      {activeDraft && <SpeechBubble color={user.color} typingOnly />}
      {activeChat && (
        <SpeechBubble message={activeChat} color={user.color} expiresAt={user.chat.expiresAt} />
      )}
    </div>
  );
}

function LocalPresence({ self, cursor, draft, localChat, isMobile }) {
  const showDraft = !isMobile && draft.length > 0;
  const showMobileTyping = isMobile && draft.length > 0;
  const showChat = localChat && localChat.expiresAt > Date.now();

  if (!showDraft && !showMobileTyping && !showChat) return null;

  const left = `${cursor.x * 100}vw`;
  const top = `${cursor.y * 100}vh`;

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
      <CursorPointer color={self.color} />
      {showDraft && (
        <>
          <SpeechBubble message={draft} color={self.color} isDraft />
          <div className="presence-hint">press enter to send</div>
        </>
      )}
      {showMobileTyping && <SpeechBubble color={self.color} typingOnly />}
      {showChat && (
        <SpeechBubble message={localChat.message} color={self.color} expiresAt={localChat.expiresAt} />
      )}
    </div>
  );
}

export default function PresenceLayer({
  others,
  self,
  cursor,
  draft,
  localChat,
  connected,
  isMobile,
}) {
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
        .speech-bubble {
          margin-top: 6px;
          margin-left: 10px;
          max-width: 220px;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.4;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          word-break: break-word;
          transition: opacity 0.2s ease;
        }
        .presence-cursor__name {
          margin-top: 2px;
          margin-left: 12px;
          font-size: 11px;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        .presence-hint {
          margin-top: 4px;
          margin-left: 10px;
          font-size: 10px;
          color: var(--text-muted);
          font-family: 'DM Mono', monospace;
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

      {!connected && isSupabaseConfigured() && !isMobile && (
        <div className="presence-connecting">connecting to presence…</div>
      )}

      {others.map((user) => (
        <RemotePresence key={user.id} user={user} />
      ))}

      <LocalPresence
        self={self}
        cursor={cursor}
        draft={draft}
        localChat={localChat}
        isMobile={isMobile}
      />
    </>
  );
}
