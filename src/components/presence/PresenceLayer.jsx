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

function SpeechBubble({ message, color, expiresAt }) {
  const remaining = expiresAt ? expiresAt - Date.now() : null;
  const fadeOpacity = remaining != null && remaining < 400 ? Math.max(0, remaining / 400) : 1;

  return (
    <div
      className="speech-bubble"
      style={{
        background: color,
        border: `1px solid ${color}`,
        color: "#0a0a0a",
        opacity: fadeOpacity,
        animation: "presenceFadeIn 0.15s ease",
      }}
    >
      {message}
    </div>
  );
}

function RemotePresence({ user }) {
  const activeChat = user.chat && user.chat.expiresAt > Date.now() ? user.chat.message : null;

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
      {activeChat && (
        <SpeechBubble message={activeChat} color={user.color} expiresAt={user.chat.expiresAt} />
      )}
    </div>
  );
}

function LocalPresence({ self, cursor, localChat }) {
  const showChat = localChat && localChat.expiresAt > Date.now();
  if (!showChat) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${cursor.x * 100}vw`,
        top: `${cursor.y * 100}vh`,
        zIndex: 151,
        pointerEvents: "none",
        transform: "translate(-2px, -2px)",
      }}
    >
      <CursorPointer color={self.color} />
      <SpeechBubble message={localChat.message} color={self.color} expiresAt={localChat.expiresAt} />
    </div>
  );
}

export default function PresenceLayer({
  others,
  self,
  cursor,
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

      {!connected && isSupabaseConfigured() && !isMobile && (
        <div className="presence-connecting">connecting to presence…</div>
      )}

      {others.map((user) => (
        <RemotePresence key={user.id} user={user} />
      ))}

      <LocalPresence self={self} cursor={cursor} localChat={localChat} />
    </>
  );
}
