import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";

export default function ChatReactionStrip({ summaries = [], selfId, onToggleReaction }) {
  if (!summaries.length) return null;

  return (
    <div className="chat-message__reactions" role="group" aria-label="Message reactions">
      {summaries.map((entry) => {
        const isMine = entry.reactorIds.includes(selfId);

        return (
          <button
            key={entry.emoji}
            type="button"
            className={`chat-reaction${isMine ? " chat-reaction--mine" : ""}`}
            onMouseDown={suppressMouseFocus}
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleReaction(entry.emoji);
            }}
            aria-label={`${entry.emoji}, ${entry.count} reaction${entry.count === 1 ? "" : "s"}${isMine ? ", including you" : ""}`}
          >
            <span className="chat-reaction__emoji" aria-hidden="true">
              {entry.emoji}
            </span>
            {entry.count > 1 && (
              <span className="chat-reaction__count">{entry.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
