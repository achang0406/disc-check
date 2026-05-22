import Button from "./Button.jsx";

export default function EmptyState({ icon = "🌬️", text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <p className="empty-state__icon">{icon}</p>
      <p className="empty-state__text">{text}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
