import { CHAT_INPUT_PLACEHOLDER, MAX_CHAT_LENGTH } from "../../constants/presence.js";

export default function ChatBar({
  inputRef,
  value,
  onChange,
  onSend,
  connected,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!connected || !value.trim()) return;
    onSend(value);
  };

  return (
    <div className="chat-bar-anchor chat-bar-anchor--detail">
      <div className="chat-bar-stack">
        <form className="chat-bar composer-row" onSubmit={handleSubmit}>
          <div className="composer-field chat-bar__field" data-walkthrough-target="chat-bar">
            <input
              ref={inputRef}
              className="composer-field__input chat-bar__input"
              type="text"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={connected ? CHAT_INPUT_PLACEHOLDER : "Connecting…"}
              disabled={!connected}
              maxLength={MAX_CHAT_LENGTH}
              enterKeyHint="send"
              autoComplete="off"
            />
            <button
              type="submit"
              className="composer-field__submit chat-bar__send"
              disabled={!connected || !value.trim()}
              aria-label="Send message"
              title="Send message"
            >
              →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
