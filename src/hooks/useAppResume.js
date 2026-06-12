import { useEffect } from "react";
import { isAndroidDevice, isIosDevice, isStandaloneDisplay, syncIosStandaloneClass } from "../utils/pwaInstall.js";

function recoverPaint() {
  const shell = document.querySelector(".app-shell");
  if (!(shell instanceof HTMLElement)) return;

  shell.style.transform = "translateZ(0)";
  requestAnimationFrame(() => {
    shell.style.transform = "";
  });
}

export function useAppResume() {
  useEffect(() => {
    syncIosStandaloneClass();

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = () => syncIosStandaloneClass();
    standaloneQuery.addEventListener("change", onStandaloneChange);

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
      standaloneQuery.removeEventListener("change", onStandaloneChange);
      document.documentElement.classList.remove("ios-standalone");
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}
