import { useEffect } from "react";
import { isAndroidDevice, isStandaloneDisplay, syncIosStandaloneClass } from "../utils/pwaInstall.js";

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

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      syncIosStandaloneClass();
      recoverPaint();
    };

    const onPageShow = (event) => {
      if (event.persisted) {
        window.location.reload();
        return;
      }
      syncIosStandaloneClass();
      recoverPaint();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);

    if (isAndroidDevice() && isStandaloneDisplay()) {
      window.addEventListener("focus", onVisible);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}
