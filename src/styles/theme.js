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

  .game-card__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .game-card__title {
    margin: 0;
    font-size: clamp(15px, 0.9vw + 13px, 19px);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
    min-width: 0;
  }

  .game-card__edit-btn {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    font-size: 10px;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    line-height: 1.4;
  }

  .game-card__edit-btn:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .game-card__meta {
    margin: 4px 0 0;
    font-size: clamp(11px, 0.25vw + 10px, 13px);
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
    line-height: 1.4;
  }

  .location-display {
    position: relative;
    display: inline;
  }

  .location-display__label {
    border-bottom: 1px dotted var(--text-faint);
    cursor: default;
  }

  .location-display__tooltip {
    position: absolute;
    left: 0;
    top: calc(100% + 6px);
    z-index: 20;
    min-width: max-content;
    max-width: 260px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    color: var(--text);
    font-size: 11px;
    line-height: 1.4;
    white-space: normal;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.12s ease, visibility 0.12s ease;
  }

  .location-display:hover .location-display__tooltip,
  .location-display:focus-within .location-display__tooltip {
    opacity: 1;
    visibility: visible;
  }

  .game-card__detail {
    margin: 0 0 clamp(8px, 1vw, 12px);
    font-size: clamp(11px, 0.25vw + 10px, 13px);
    color: var(--text-subtle);
    font-family: 'DM Mono', monospace;
    line-height: 1.4;
  }

  .game-card__divider {
    margin-top: clamp(10px, 1.2vw, 14px);
    padding-top: clamp(10px, 1.2vw, 14px);
    border-top: 1px solid var(--card-divider);
  }

  .game-card__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .game-card__plus-ones {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    border: 1px solid var(--card-ring);
    background: transparent;
    flex-shrink: 0;
    opacity: 0.85;
  }

  .game-card__plus-btn {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: transparent;
    border: none;
    color: var(--text-subtle);
    font-size: 14px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
  }

  .game-card__plus-btn:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  .game-card__plus-btn:not(:disabled):hover {
    color: var(--text);
    background: var(--btn-bg);
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
    font-size: 12px;
    font-weight: 500;
    min-width: 14px;
    text-align: center;
    font-family: 'DM Mono', monospace;
    color: var(--text-muted);
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

  .games-screen__admin-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: 'DM Mono', monospace;
    font-weight: 600;
  }

  .games-screen__add-game {
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--rsvp-btn-bg);
    border: 1px solid var(--chip-you-border);
    color: var(--rsvp-btn-text);
    font-size: 12px;
    font-weight: 600;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
  }

  .games-screen__add-game--header {
    padding: 6px 12px;
    font-size: 11px;
  }

  .games-screen__admin-link {
    background: none;
    border: none;
    color: var(--text-faint);
    font-size: 11px;
    font-family: 'DM Mono', monospace;
    cursor: pointer;
    padding: 0;
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

  .status-badge--almost {
    background: var(--status-almost-bg);
    border-color: var(--status-almost-color);
    color: var(--status-almost-color);
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

  .games-screen {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .chat-bar-anchor {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 160;
    display: flex;
    justify-content: center;
    padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
  }

  .mobile-chat-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(100%, 640px);
    pointer-events: none;
  }

  .mobile-chat-bar__input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 1px solid var(--card-ring);
    border-radius: 999px;
    padding: 10px 14px;
    color: var(--text);
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    pointer-events: auto;
    opacity: 0.85;
  }

  .mobile-chat-bar__input:focus {
    outline: none;
    border-color: var(--card-ring) !important;
    opacity: 0.85;
  }

  .mobile-chat-bar__input::placeholder {
    color: var(--text-faint);
  }

  .mobile-chat-bar__send {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    opacity: 0.85;
  }

  .mobile-chat-bar__send:not(:disabled):active {
    opacity: 1;
    border-color: var(--text-faint);
    color: var(--text);
  }

  .mobile-chat-bar__send:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .presence-connecting {
    position: fixed;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    right: 16px;
    z-index: 149;
    pointer-events: none;
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    border-radius: 8px;
    padding: 6px 10px;
  }

`;
