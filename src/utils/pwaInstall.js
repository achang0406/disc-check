export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

const IOS_STANDALONE_CLASS = "ios-standalone";

export function syncIosStandaloneClass() {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle(
    IOS_STANDALONE_CLASS,
    isIosDevice() && isStandaloneDisplay(),
  );
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(ua);
  const isIpadOs =
    navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;

  return isAppleMobile || isIpadOs;
}

/** Platform for manual install steps when no native prompt is available. */
export function getManualInstallPlatform() {
  if (isStandaloneDisplay()) return null;
  if (isIosDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  return null;
}

export function canOfferManualInstall() {
  return getManualInstallPlatform() !== null;
}
