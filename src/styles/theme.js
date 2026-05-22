import { uiStyles } from "./ui.css.js";
import { TOKEN_CSS } from "./tokens.js";

export const card = {
  background: "var(--card-bg)",
  borderRadius: "var(--radius-lg)",
  padding: "var(--space-4) calc(var(--space-4) + 2px)",
};

export const label = {
  fontSize: "var(--font-label)",
  color: "var(--text-muted)",
  fontFamily: "var(--font-mono)",
  display: "block",
  marginBottom: 5,
};

export const input = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-2) var(--space-3)",
  color: "var(--text)",
  fontSize: "var(--font-body)",
  fontFamily: "var(--font-sans)",
  width: "100%",
  outline: "none",
};

export const globalStyles = `
  :root {
    ${TOKEN_CSS}
  }

  ${uiStyles}

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    overscroll-behavior: none;
  }

  html {
    height: 100vh;
    height: 100dvh;
  }

  body, #root {
    height: 100%;
  }

  .app-shell {
    height: 100%;
    overflow: hidden;
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
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    padding: clamp(14px, 1.6vw, 20px) clamp(var(--space-4), 1.8vw, 22px);
    box-shadow: 0 0 0 1px var(--card-ring);
    font-size: clamp(12px, 0.35vw + 11px, 14px);
    min-height: 0;
  }

  .game-card--detail {
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
  }

  .game-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .game-card__header-main {
    min-width: 0;
    flex: 1;
  }

  .game-card__header-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .game-card__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .game-card--rsvpd {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-card--here {
    box-shadow: 0 0 0 1px var(--status-go-color, #22c55e);
  }

  .game-card--live {
    box-shadow: 0 0 0 1px var(--card-ring-live);
  }

  .game-card--cancelled {
    opacity: 0.45;
  }

  .game-card__status-pill {
    flex-shrink: 0;
    align-self: center;
    font-size: 0.72em;
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--chip-you-bg);
    border: 1px solid var(--chip-you-border);
    color: var(--chip-you-text);
    font-family: 'DM Mono', monospace;
  }

  .game-card__phase-stack {
    position: relative;
    display: grid;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .game-card--detail .game-card__phase {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .game-card__phase {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    transition: opacity 0.45s ease, transform 0.45s ease, visibility 0.45s ease;
  }

  .game-card__phase--rsvp {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
  }

  .game-card__phase--rsvp.game-card__phase--exit {
    opacity: 0;
    transform: translateY(-10px);
    visibility: hidden;
    pointer-events: none;
  }

  .game-card__phase--live {
    opacity: 0;
    transform: translateY(12px);
    visibility: hidden;
    pointer-events: none;
  }

  .game-card__phase--live.game-card__phase--active {
    opacity: 1;
    transform: translateY(0);
    visibility: visible;
    pointer-events: auto;
  }

  .game-card__section {
    margin-top: 10px;
    flex: 1;
  }

  .game-card__section-label {
    margin: 0 0 6px;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-family: 'DM Mono', monospace;
  }

  .game-card__section-label--locked {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .game-card__locked-rsvp {
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    opacity: 0.92;
    transition: opacity 0.45s ease, transform 0.45s ease;
  }

  .game-card--live .game-card__locked-rsvp {
    animation: gameCardLockIn 0.5s ease 0.1s both;
  }

  @keyframes gameCardLockIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 0.92; transform: translateY(0); }
  }

  .progress-bar__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
  }

  .progress-bar__label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-faint);
    font-family: 'DM Mono', monospace;
  }

  .progress-bar__count {
    font-size: 0.92em;
    color: var(--text-subtle);
    font-family: 'DM Mono', monospace;
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
    min-width: 0;
  }

  .game-card__action--rsvp.game-card__action--saving {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .game-card__action--cancel {
    font-family: var(--font-mono);
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
    position: relative;
    z-index: 1;
    width: 100%;
    color: var(--text);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  .games-screen--with-chat {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .games-screen__main {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 16px;
    width: 100%;
    box-sizing: border-box;
  }

  .games-screen__main--landing {
    align-items: flex-start;
    padding-top: 12px;
  }

  .games-screen__main--detail {
    align-items: center;
    justify-content: center;
    padding: clamp(8px, 2.5vw, 32px);
    overflow: hidden;
  }

  .games-screen__empty {
    text-align: center;
    margin: auto;
  }

  .games-screen__empty-text {
    color: var(--text-muted);
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    margin: 0 0 12px;
  }

  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 0;
    flex-shrink: 0;
    gap: 12px;
  }

  .app-header__leading {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .app-header__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .app-header__logo {
    font-size: 22px;
    line-height: 1;
  }

  .app-header__title {
    font-size: 17px;
    font-weight: 700;
  }

  .app-header__back {
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

  .app-header__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .app-header__profile {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
  }

  .app-header__avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--profile-bg);
    border: 1px solid var(--profile-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: var(--profile-text);
    font-family: 'DM Mono', monospace;
  }

  .app-header__profile-name {
    font-size: 12px;
    color: var(--header-muted);
    font-family: 'DM Mono', monospace;
  }

  .game-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: min(640px, 92vw);
    margin: 0 auto;
  }

  .game-list-item {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: clamp(14px, 1.6vw, 18px) clamp(var(--space-4), 1.8vw, 20px);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .game-list-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 0 1px var(--text-faint);
  }

  .game-list-item--cancelled {
    opacity: 0.45;
  }

  .game-list-item__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }

  .game-list-item__title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .game-list-item__title {
    margin: 0;
    font-size: clamp(15px, 0.9vw + 13px, 18px);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
  }

  .game-list-item__badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .game-list-item__meta {
    margin: 0;
    font-size: clamp(11px, 0.25vw + 10px, 13px);
  }

  .game-list-item__detail,
  .meta-row--schedule.game-list-item__detail {
    margin: 4px 0 0;
    color: var(--text-subtle);
  }

  .game-list-item__footer {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--card-divider);
  }

  .game-list-item__count {
    font-size: 11px;
    color: var(--text-subtle);
    font-family: 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .game-list-item__live {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: 'DM Mono', monospace;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .game-list-item__cta {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
  }

  .game-detail {
    container-type: inline-size;
    container-name: game-detail;
    width: min(var(--max-detail), calc(100vw - 2 * clamp(8px, 2.5vw, 32px)));
    height: min(
      680px,
      calc(100dvh - 6.5rem - env(safe-area-inset-bottom, 0px) - 2 * clamp(8px, 2.5vw, 32px))
    );
    max-height: 100%;
    min-height: 0;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .game-detail .game-card {
    width: 100%;
  }

  @container game-detail (max-width: 380px) {
    .meta-row__city,
    .game-card__meta-city,
    .meta-row__slot,
    .game-card__detail-slot,
    .meta-row__type,
    .game-card__detail-type,
    .game-card__section-label,
    .game-card__chips--compact-hide {
      display: none;
    }

    .game-card__header-badges .status-badge {
      padding: 4px 10px;
      font-size: 11px;
    }

    .game-card__locked-rsvp {
      margin-bottom: 8px;
      padding: 8px 10px;
    }
  }

  @media (max-width: 480px) {
    .app-header__profile-name {
      display: none;
    }
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
