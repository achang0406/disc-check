import { createPortal } from "react-dom";
import { APP_NAME } from "../../constants/app.js";
import { WELCOME_TARGETS } from "../../constants/welcome.js";
import { usePwaInstall } from "../../hooks/usePwaInstall.js";
import { getPortalTarget } from "../../utils/portalTarget.js";
import { suppressMouseFocus } from "../../utils/suppressMouseFocus.js";
import ModalShell from "../ui/ModalShell.jsx";

function ManualInstallSteps({ platform }) {
  if (platform === "android") {
    return (
      <ol className="install-app-help">
        <li>Tap the menu button (⋮) in the top-right of Chrome.</li>
        <li>
          Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
        </li>
        <li>
          Tap <strong>Install</strong> to confirm.
        </li>
      </ol>
    );
  }

  return (
    <ol className="install-app-help">
      <li>Tap the Share button at the bottom of Safari.</li>
      <li>
        Scroll down and tap <strong>Add to Home Screen</strong>.
      </li>
      <li>
        Tap <strong>Add</strong> in the top-right corner.
      </li>
    </ol>
  );
}

export default function InstallAppLink() {
  const { canInstall, installing, manualInstallHelp, promptInstall, closeManualInstallHelp, usesNativePrompt } =
    usePwaInstall();
  const portalTarget = getPortalTarget();

  if (!canInstall) {
    return null;
  }

  const manualHelpModal =
    manualInstallHelp && !usesNativePrompt ? (
      <ModalShell
        title="Add to Home Screen"
        description={`Install ${APP_NAME} for quick access, push notifications, and a full-screen app experience.`}
        onClose={closeManualInstallHelp}
        footer={
          <button type="button" className="btn btn--primary" onClick={closeManualInstallHelp}>
            Got it
          </button>
        }
      >
        <ManualInstallSteps platform={manualInstallHelp} />
      </ModalShell>
    ) : null;

  return (
    <>
      <button
        type="button"
        className="install-app-link"
        data-walkthrough-target={WELCOME_TARGETS.INSTALL_LINK}
        onMouseDown={suppressMouseFocus}
        onClick={() => {
          void promptInstall();
        }}
        disabled={installing}
      >
        {installing ? "Adding…" : "Add to Home Screen"}
      </button>

      {manualHelpModal && portalTarget ? createPortal(manualHelpModal, portalTarget) : null}
    </>
  );
}
