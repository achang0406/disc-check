/** Layout & typography tokens — injected as CSS custom properties on :root. */
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
  "--bp-wide-min": "768px",
  "--bp-compact-max": "767px",
  "--max-detail": "640px",
  "--max-list": "640px",
  "--max-modal": "480px",
  "--max-modal-sm": "400px",
  "--z-toast": "100",
  "--z-presence": "150",
  "--z-chat": "160",
  "--z-modal": "200",
};

export const TOKEN_CSS = Object.entries(TOKENS)
  .map(([key, value]) => `${key}: ${value};`)
  .join("\n    ");
