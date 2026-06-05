/**
 * Layout & typography tokens — injected as CSS custom properties on `:root`.
 *
 * Breakpoints (min-width, mobile-first). See `src/constants/breakpoints.js`.
 * Responsive steps are applied in `theme.js` at sm / lg (md is layout-only).
 *
 * Layout tokens: `--layout-gutter*`, `--layout-inline-gap`, `--layout-stack-gap`,
 * `--game-card-inset-*`, `--game-list-gap`, `--chat-bar-inset-*`
 */
export const TOKENS = {
  "--space-1": "4px",
  "--space-2": "8px",
  "--space-3": "12px",
  "--space-4": "16px",
  "--space-5": "24px",
  "--space-6": "32px",
  "--radius-sm": "8px",
  "--radius-md": "12px",
  "--radius-lg": "14px",
  "--radius-pill": "999px",
  "--font-label": "11px",
  "--font-body": "13px",
  "--font-emphasis": "15px",
  "--font-title": "17px",
  "--font-display": "22px",
  "--font-sans": "'DM Sans', sans-serif",
  "--font-mono": "'DM Mono', monospace",
  "--bp-sm-min": "640px",
  "--bp-md-min": "768px",
  "--bp-lg-min": "1024px",
  "--bp-xl-min": "1280px",
  "--bp-wide-min": "768px",
  "--bp-compact-max": "767px",
  "--max-detail": "640px",
  "--max-list": "640px",
  "--max-modal": "480px",
  "--max-modal-sm": "400px",
  "--layout-gutter": "var(--space-3)",
  "--layout-gutter-detail": "var(--space-3)",
  "--layout-inline-gap": "var(--space-2)",
  "--layout-stack-gap": "var(--space-2)",
  "--game-list-gap": "var(--space-3)",
  "--game-carousel-peek": "0px",
  "--content-rail-width": "min(var(--max-list), calc(100vw - 2 * var(--chat-bar-inset-x) - 2 * var(--game-carousel-peek)))",
  "--game-carousel-gap": "var(--space-5)",
  "--game-carousel-slide-width": "var(--content-rail-width)",
  "--game-carousel-edge-pad": "calc((100vw - var(--game-carousel-slide-width)) / 2)",
  "--game-card-inset-y": "var(--space-3)",
  "--game-card-inset-x": "var(--space-3)",
  "--game-commit-chip-row-height": "calc(var(--font-body) * 1.3 + 2 * var(--space-1))",
  "--game-carousel-slot-height": "250px",
  "--z-toast": "100",
  "--z-presence": "150",
  "--z-chat": "160",
  "--z-modal": "200",
  "--chat-bar-inset-x": "var(--space-3)",
  "--chat-bar-inset-y": "var(--space-2)",
  "--chat-bar-width-wide": "50vw",
  "--chat-thread-gap": "var(--space-2)",
  "--safe-area-top": "env(safe-area-inset-top, 0px)",
  "--safe-area-bottom": "env(safe-area-inset-bottom, 0px)",
  "--safe-area-left": "env(safe-area-inset-left, 0px)",
  "--safe-area-right": "env(safe-area-inset-right, 0px)",
  "--chat-underlap": "40px",
  "--min-viewport-height": "600px",
};

export const TOKEN_CSS = Object.entries(TOKENS)
  .map(([key, value]) => `${key}: ${value};`)
  .join("\n    ");
