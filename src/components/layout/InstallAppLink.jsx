import { usePwaInstall } from "../../hooks/usePwaInstall.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";
import Button from "../ui/Button.jsx";
import ModalShell from "../ui/ModalShell.jsx";

export default function InstallAppLink() {
  const { canInstall, installing, showIosHelp, promptInstall, closeIosHelp, usesNativePrompt } = usePwaInstall();

  if (!canInstall) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="install-app-link"
        onMouseDown={suppressMouseFocus}
        onClick={() => {
          void promptInstall();
        }}
        disabled={installing}
      >
        {installing ? "Adding…" : "Add to home screen"}
      </button>

      {showIosHelp && !usesNativePrompt ? (
        <ModalShell
          title="Add to Home Screen"
          description="Install DiscCheck for quick access, push notifications, and a full-screen app experience."
          onClose={closeIosHelp}
          footer={
            <Button variant="primary" onClick={closeIosHelp}>
              Got it
            </Button>
          }
        >
          <ol className="install-app-help">
            <li>Tap the Share button at the bottom of Safari.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right corner.</li>
          </ol>
        </ModalShell>
      ) : null}
    </>
  );
}
