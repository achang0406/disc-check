import Button from "../ui/Button.jsx";
import ModalShell from "../ui/ModalShell.jsx";

export default function DeleteGameModal({ game, saving, onConfirm, onClose }) {
  if (!game) return null;

  return (
    <ModalShell
      title="Delete game?"
      description={
        <>
          This will permanently delete <strong style={{ color: "var(--text)" }}>{game.name}</strong> and
          all RSVPs for it.
        </>
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" block disabled={saving} onClick={onConfirm}>
            {saving ? "Deleting..." : "Delete game"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    />
  );
}
