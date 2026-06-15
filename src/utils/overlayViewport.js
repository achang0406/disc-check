/**
 * Viewport metrics for fixed overlays (walkthrough scrim/bubble).
 * Prefer visualViewport so cutout coords match getBoundingClientRect on iOS PWA,
 * where layout units (100vh) and window.innerHeight can diverge.
 */
export function getOverlayViewport() {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, offsetTop: 0, offsetLeft: 0 };
  }

  const vv = window.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
  };
}
