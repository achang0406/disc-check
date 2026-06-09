import { useEffect } from "react";
import { isAndroidDevice, isStandaloneDisplay } from "../utils/pwaInstall.js";

function syncAppHeight() {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
}

function recoverPaint() {
  syncAppHeight();

  const shell = document.querySelector(".app-shell");
  if (!(shell instanceof HTMLElement)) return;

  shell.style.transform = "translateZ(0)";
  requestAnimationFrame(() => {
    shell.style.transform = "";
  });
}

export function useAppResume() {
  useEffect(() => {
    syncAppHeight();

    const onViewportChange = () => syncAppHeight();
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      recoverPaint();
    };

    const onPageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
        return;
      }
      recoverPaint();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);

    if (isAndroidDevice() && isStandaloneDisplay()) {
      window.addEventListener("focus", onVisible);
    }

    return () => {
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}
