import { useCallback, useEffect, useState } from "react";
import { canOfferIosInstall, isStandaloneDisplay } from "../utils/pwaInstall.js";
import {
  getDeferredPwaInstallPrompt,
  setDeferredPwaInstallPrompt,
  subscribeDeferredPwaInstallPrompt,
} from "../utils/pwaInstallPrompt.js";

function readCanInstall(prompt) {
  if (typeof window === "undefined" || isStandaloneDisplay()) return false;
  return Boolean(prompt) || canOfferIosInstall();
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => getDeferredPwaInstallPrompt());
  const [canInstall, setCanInstall] = useState(() => readCanInstall(getDeferredPwaInstallPrompt()));
  const [installing, setInstalling] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setCanInstall(false);
      setDeferredPrompt(null);
      return undefined;
    }

    const syncAvailability = (prompt) => {
      setDeferredPrompt(prompt);
      setCanInstall(readCanInstall(prompt));
    };

    syncAvailability(getDeferredPwaInstallPrompt());

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPwaInstallPrompt(event);
      syncAvailability(event);
    };

    const onAppInstalled = () => {
      setDeferredPwaInstallPrompt(null);
      syncAvailability(null);
      setShowIosHelp(false);
    };

    const unsubscribe = subscribeDeferredPwaInstallPrompt(syncAvailability);

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => {
      if (isStandaloneDisplay()) {
        setDeferredPwaInstallPrompt(null);
        syncAvailability(null);
        setShowIosHelp(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    standaloneQuery.addEventListener("change", syncStandalone);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneQuery.removeEventListener("change", syncStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPrompt ?? getDeferredPwaInstallPrompt();
    if (prompt) {
      setInstalling(true);
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        setDeferredPwaInstallPrompt(null);
        setDeferredPrompt(null);
        if (outcome === "accepted") {
          setCanInstall(false);
          return true;
        }
        return false;
      } finally {
        setInstalling(false);
      }
    }

    if (canOfferIosInstall()) {
      setShowIosHelp(true);
      return false;
    }

    return false;
  }, [deferredPrompt]);

  const closeIosHelp = useCallback(() => {
    setShowIosHelp(false);
  }, []);

  return {
    canInstall,
    installing,
    showIosHelp,
    promptInstall,
    closeIosHelp,
    usesNativePrompt: Boolean(deferredPrompt),
  };
}
