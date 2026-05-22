import { useEffect, useRef } from "react";

function ChatBubble({ message, selfId }) {
  const isSelf = message.senderId === selfId;

  return (
    <div className={`chat-message${isSelf ? " chat-message--self" : ""}`}>
      {!isSelf && <span className="chat-message__name">{message.name}</span>}
      <div
        className="chat-message__bubble"
        style={
          isSelf
            ? { background: message.color, borderColor: message.color }
            : undefined
        }
      >
        {message.text}
      </div>
    </div>
  );
}

export default function GameChatThread({ messages, selfId }) {
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickToBottomRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  };

  return (
    <div
      ref={scrollRef}
      className="game-detail-layout__thread"
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 ? (
        <p className="game-chat-thread__empty">Say hi — chat helps get a game going.</p>
      ) : (
        messages.map((message) => (
          <ChatBubble key={message.id} message={message} selfId={selfId} />
        ))
      )}
    </div>
  );
}
