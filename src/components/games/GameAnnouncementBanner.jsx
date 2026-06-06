export default function GameAnnouncementBanner({ message }) {
  const trimmed = message?.trim();
  if (!trimmed) return null;

  return (
    <div className="game-announcement-banner" role="note" aria-label="Game announcement">
      <span className="game-announcement-banner__label">Announcement</span>
      <p className="game-announcement-banner__message">{trimmed}</p>
    </div>
  );
}
