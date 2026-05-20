export const card = {
  background: "var(--card-bg)",
  borderRadius: 14,
  padding: "16px 18px",
};

export const label = {
  fontSize: 11,
  color: "var(--text-muted)",
  fontFamily: "'DM Mono',monospace",
  display: "block",
  marginBottom: 5,
};

export const input = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  padding: "8px 12px",
  color: "var(--text)",
  fontSize: 13,
  fontFamily: "'DM Sans',sans-serif",
  width: "100%",
  outline: "none",
};

export function smallButton(bg, border, color) {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 6,
    color,
    fontSize: 11,
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "'DM Mono',monospace",
    whiteSpace: "nowrap",
  };
}

export const globalStyles = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  html, body, #root {
    margin: 0;
    padding: 0;
    min-height: 100%;
  }

  * { box-sizing: border-box; }
  input:focus, select:focus { border-color: #22c55e !important; outline: none; }
  ::placeholder { color: var(--text-faint); }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(240px, 26vw, 340px), 1fr));
    gap: clamp(10px, 1.5vw, 16px);
    width: 100%;
    max-width: min(960px, 92vw);
    justify-content: center;
    align-items: stretch;
  }

  .game-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    border-radius: clamp(12px, 1.1vw, 16px);
    padding: clamp(14px, 1.6vw, 20px) clamp(16px, 1.8vw, 22px);
    box-shadow: 0 0 0 1px var(--card-ring);
    font-size: clamp(12px, 0.35vw + 11px, 14px);
  }

  .game-card--rsvpd {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-card--cancelled {
    opacity: 0.45;
  }

  .game-card__title {
    margin: 0;
    font-size: clamp(15px, 0.9vw + 13px, 19px);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
  }

  .game-card__meta {
    margin: 4px 0 0;
    font-size: clamp(11px, 0.25vw + 10px, 13px);
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .game-card__detail {
    margin: 0 0 clamp(8px, 1vw, 12px);
    font-size: clamp(11px, 0.25vw + 10px, 13px);
    color: var(--text-subtle);
    font-family: 'DM Mono', monospace;
    line-height: 1.4;
  }

  .game-card__section-label {
    margin: 0 0 8px;
    font-size: clamp(11px, 0.25vw + 10px, 13px);
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
  }

  .game-card__divider {
    margin-top: clamp(10px, 1.2vw, 14px);
    padding-top: clamp(10px, 1.2vw, 14px);
    border-top: 1px solid var(--card-divider);
  }

  .game-card__counter {
    width: clamp(28px, 2.5vw, 34px);
    height: clamp(28px, 2.5vw, 34px);
    border-radius: 7px;
    background: var(--btn-bg);
    border: 1px solid var(--btn-border);
    color: var(--text);
    font-size: clamp(15px, 0.5vw + 14px, 18px);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
  }

  .game-card__counter:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .game-card__plus-value {
    font-size: clamp(14px, 0.4vw + 13px, 16px);
    font-weight: 600;
    min-width: 18px;
    text-align: center;
    font-family: 'DM Mono', monospace;
    color: var(--text);
  }

  .game-card__action {
    flex: 1;
    padding: clamp(8px, 0.8vw, 10px) clamp(10px, 1vw, 14px);
    border-radius: 9px;
    font-size: clamp(13px, 0.35vw + 12px, 15px);
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
  }

  .game-card__action:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .game-card__action--rsvp {
    background: var(--rsvp-btn-bg);
    border: 1px solid var(--rsvp-btn-border);
    color: var(--rsvp-btn-text);
  }

  .game-card__action--rsvp.game-card__action--saving {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .game-card__action--cancel {
    background: var(--cancel-btn-bg);
    border: 1px solid var(--cancel-btn-border);
    color: var(--cancel-btn-text);
    font-family: 'DM Mono', monospace;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 5px 14px;
    font-family: 'DM Mono', monospace;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.06em;
    border: 1.5px solid;
    flex-shrink: 0;
  }

  .status-badge--large {
    gap: 10px;
    padding: 8px 20px;
    font-size: 18px;
  }

  .status-badge--go {
    background: var(--status-go-bg);
    border-color: var(--status-go-color);
    color: var(--status-go-color);
  }

  .status-badge--not {
    background: var(--status-not-bg);
    border-color: var(--status-not-color);
    color: var(--status-not-color);
  }

  .status-badge--cancelled {
    background: var(--status-cancelled-bg);
    border-color: var(--status-cancelled-color);
    color: var(--status-cancelled-color);
  }

  .status-badge__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
    display: inline-block;
    flex-shrink: 0;
  }

  .status-badge--large .status-badge__dot {
    width: 10px;
    height: 10px;
  }

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: var(--toggle-bg);
    border: 1px solid var(--toggle-border);
    color: var(--text);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }
`;
