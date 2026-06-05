export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export function syncStandaloneRootClass() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("pwa-standalone", isStandaloneDisplay());
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(ua);
  const isIpadOs =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;

  return isAppleMobile || isIpadOs;
}

export function canOfferIosInstall() {
  return isIosDevice() && !isStandaloneDisplay();
}
