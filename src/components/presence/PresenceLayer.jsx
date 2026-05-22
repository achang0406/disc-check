import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "../../lib/supabase.js";

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

function SpeechBubble({ message, color, expiresAt, draft = false }) {
  const remaining = expiresAt ? expiresAt - Date.now() : null;
  const fadeOpacity = remaining != null && remaining < 400 ? Math.max(0, remaining / 400) : 1;

  return (
    <div
      className={`speech-bubble${draft ? " speech-bubble--draft" : ""}`}
      style={{
        background: color,
        border: `1px solid ${color}`,
        color: "#0a0a0a",
        opacity: draft ? 0.85 : fadeOpacity,
        animation: "presenceFadeIn 0.15s ease",
      }}
    >
      {message}
    </div>
  );
}

function RemotePresence({ user, signedUp }) {
  const activeChat = user.chat && user.chat.expiresAt > Date.now() ? user.chat.message : null;

  return (
    <div
      className={`presence-cursor${signedUp ? " presence-cursor--rsvp" : ""}`}
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
      <CursorPointer color={user.color} glow={signedUp} />
      <div
        className="presence-cursor__name"
        style={{
          color: user.color,
          textShadow: signedUp ? `0 0 8px ${user.color}` : undefined,
        }}
      >
        {user.name}
      </div>
      {activeChat && (
        <SpeechBubble message={activeChat} color={user.color} expiresAt={user.chat.expiresAt} />
      )}
    </div>
  );
}

function SelfPresence({ self, cursor, draft, localChat, signedUp }) {
  const sentMessage = localChat && localChat.expiresAt > Date.now() ? localChat.message : null;
  const hasDraft = Boolean(draft.trim());

  return (
    <div
      className={`presence-cursor presence-cursor--self${signedUp ? " presence-cursor--rsvp" : ""}`}
      style={{
        position: "fixed",
        left: `${cursor.x * 100}vw`,
        top: `${cursor.y * 100}vh`,
        zIndex: 151,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
        transition: "left 80ms linear, top 80ms linear",
      }}
    >
      <CursorPointer color={self.color} glow={signedUp} />
      <div
        className="presence-cursor__name"
        style={{
          color: self.color,
          textShadow: signedUp ? `0 0 8px ${self.color}` : undefined,
        }}
      >
        {self.name}
      </div>
      {hasDraft && <SpeechBubble message={draft} color={self.color} draft />}
      {sentMessage && !hasDraft && (
        <SpeechBubble message={sentMessage} color={self.color} expiresAt={localChat.expiresAt} />
      )}
    </div>
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

  const showHint =
    isWide &&
    connected &&
    !draft.trim() &&
    isSupabaseConfigured() &&
    sessionStorage.getItem("disc_wide_chat_hint_dismissed") !== "1";

  return (
    <div className="presence-layer presence-layer--wide-only">
      <style>{`
        @keyframes presenceFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
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
      `}</style>

      {!connected && isSupabaseConfigured() && isWide && (
        <div className="presence-connecting">connecting to presence…</div>
      )}

      {showHint && (
        <div
          className="wide-chat-hint"
          onClick={() => sessionStorage.setItem("disc_wide_chat_hint_dismissed", "1")}
          style={{ pointerEvents: "auto", cursor: "pointer" }}
          title="Click to dismiss"
        >
          Tap or type anywhere to chat
        </div>
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
