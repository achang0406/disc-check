import { useCallback, useEffect, useState } from "react";
import { canOfferIosInstall, isStandaloneDisplay } from "../utils/pwaInstall.js";

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setCanInstall(false);
      return undefined;
    }

    setCanInstall(canOfferIosInstall());

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setShowIosHelp(false);
    };

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const syncStandalone = () => {
      if (isStandaloneDisplay()) {
        setDeferredPrompt(null);
        setCanInstall(false);
        setShowIosHelp(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    standaloneQuery.addEventListener("change", syncStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      standaloneQuery.removeEventListener("change", syncStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
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
