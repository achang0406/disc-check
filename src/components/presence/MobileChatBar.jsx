import { MAX_CHAT_LENGTH } from "../../constants/presence.js";

export default function MobileChatBar({ value, onChange, onSend, connected }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  return (
    <form className="mobile-chat-bar" onSubmit={handleSubmit}>
      <input
        className="mobile-chat-bar__input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={connected ? "Say something…" : "Connecting…"}
        disabled={!connected}
        maxLength={MAX_CHAT_LENGTH}
        enterKeyHint="send"
        autoComplete="off"
      />
      <button
        type="submit"
        className="mobile-chat-bar__send"
        disabled={!connected || !value.trim()}
        aria-label="Send message"
      >
        →
      </button>
    </form>
  );
}
