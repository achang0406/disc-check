import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

export default function ChatReactionStrip({ reactions = [], selfId, onToggleReaction }) {
  if (!reactions.length) return null;

  return (
    <div className="chat-message__reactions" role="group" aria-label="Message reactions">
      {reactions.map((entry) => {
        const isMine = entry.reactorId === selfId;

        return (
          <button
            key={entry.reactorId}
            type="button"
            className={`chat-reaction${isMine ? " chat-reaction--mine" : " chat-reaction--other"}`}
            onMouseDown={suppressMouseFocus}
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleReaction(entry.emoji);
            }}
            aria-label={`${entry.emoji}${isMine ? ", your reaction" : ", reaction"}`}
          >
            <span className="chat-reaction__emoji" aria-hidden="true">
              {entry.emoji}
            </span>
          </button>
        );
      })}
    </div>
  );
}
