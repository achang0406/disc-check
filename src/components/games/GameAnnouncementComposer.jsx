import { useState } from "react";
import Button from "../ui/Button.jsx";

export default function GameAnnouncementComposer({
  gameId,
  saving = false,
  onPost,
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const close = () => {
    if (saving) return;
    setOpen(false);
    setMessage("");
    setError("");
  };

  const handlePost = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Write a short message for this week");
      return;
    }

    setError("");
    const ok = await onPost({ gameId, message: trimmed });
    if (ok) {
      setMessage("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <div className="game-announcement-composer">
        <Button
          variant="ghost"
          className="game-announcement-composer__toggle"
          onClick={() => setOpen(true)}
          aria-label="Post game announcement"
          title="Post announcement"
        >
          <span className="game-announcement-composer__toggle-icon" aria-hidden="true">
            +
          </span>
          <span className="game-announcement-composer__toggle-label">Announcement</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="game-announcement-composer game-announcement-composer--open">
      <label className="game-announcement-composer__label" htmlFor={`announcement-${gameId}`}>
        This week&apos;s announcement
      </label>
      <textarea
        id={`announcement-${gameId}`}
        className="game-announcement-composer__input"
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
          setError("");
        }}
        rows={3}
        maxLength={280}
        placeholder="e.g. Field 3 tonight — bring lights"
        disabled={saving}
      />
      {error ? <p className="game-announcement-composer__error">{error}</p> : null}
      <div className="game-announcement-composer__actions">
        <Button variant="primary" disabled={saving} onClick={handlePost}>
          {saving ? "Posting…" : "Post"}
        </Button>
        <Button variant="secondary" disabled={saving} onClick={close}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
