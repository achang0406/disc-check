import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePwaInstall } from "../../hooks/usePwaInstall.js";
import { getPortalTarget } from "../../utils/portalTarget.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";
import ModalShell from "../ui/ModalShell.jsx";

export default function InstallAppLink() {
  const { canInstall, installing, showIosHelp, promptInstall, closeIosHelp, usesNativePrompt } = usePwaInstall();
  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  if (!canInstall) {
    return null;
  }

  const iosHelpModal =
    showIosHelp && !usesNativePrompt ? (
      <ModalShell
        title="Add to Home Screen"
        description="Install DiscCheck for quick access, push notifications, and a full-screen app experience."
        onClose={closeIosHelp}
        footer={
          <button type="button" className="btn btn--primary" onClick={closeIosHelp}>
            Got it
          </button>
        }
      >
        <ol className="install-app-help">
          <li>Tap the Share button at the bottom of Safari.</li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong> in the top-right corner.
          </li>
        </ol>
      </ModalShell>
    ) : null;

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
        {installing ? "Adding…" : "Add to Home Screen"}
      </button>

      {iosHelpModal && portalTarget ? createPortal(iosHelpModal, portalTarget) : null}
    </>
  );
}
