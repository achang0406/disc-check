import { uiStyles } from "./ui.css.js";
import { TOKEN_CSS } from "./tokens.js";
import { BP_LG_MIN, BP_SM_MIN } from "../constants/breakpoints.js";

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

  @media (min-width: ${BP_SM_MIN}px) {
    :root {
      --font-label: 12px;
      --font-body: 14px;
      --font-emphasis: 16px;
      --font-title: 18px;
      --font-display: 24px;
      --layout-gutter: var(--space-4);
      --layout-gutter-detail: var(--space-4);
      --game-card-inset-y: var(--space-4);
      --game-card-inset-x: var(--space-4);
      --chat-bar-inset-x: var(--space-4);
    }
  }

  @media (min-width: ${BP_LG_MIN}px) {
    :root {
      --font-label: 14px;
      --font-body: 16px;
      --font-emphasis: 18px;
      --font-title: 24px;
      --font-display: 28px;
      --max-detail: 720px;
      --max-list: 720px;
      --game-card-inset-y: var(--space-5);
      --game-card-inset-x: var(--space-5);
      --layout-gutter: var(--space-5);
      --layout-gutter-detail: var(--space-5);
      --layout-stack-gap: var(--space-3);
      --layout-inline-gap: var(--space-3);
      --game-list-gap: var(--space-4);
      --chat-bar-inset-x: var(--space-4);
      --chat-bar-inset-y: var(--space-3);
    }
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
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body, #root {
    height: 100%;
  }

  .app-shell {
    height: 100%;
    overflow: hidden;
  }

  .loading-screen {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-modal) + 10);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    color: var(--text);
    opacity: 1;
    transition: opacity 0.48s ease;
  }

  .loading-screen--exiting {
    opacity: 0;
    pointer-events: none;
  }

  .loading-screen__content {
    text-align: center;
  }

  .loading-screen__icon {
    font-size: 48px;
    margin-bottom: var(--space-4);
    line-height: 1;
  }

  .loading-screen__label {
    margin: 0;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-screen {
      transition: none;
    }
  }

  * { box-sizing: border-box; }

  button,
  a,
  summary,
  [role="button"],
  label.bringing-kit,
  .location-display--copyable {
    -webkit-tap-highlight-color: transparent;
  }

  button:focus:not(:focus-visible),
  a:focus:not(:focus-visible),
  summary:focus:not(:focus-visible),
  [role="button"]:focus:not(:focus-visible) {
    outline: none;
  }

  input:focus, select:focus { border-color: #22c55e !important; outline: none; }
  ::placeholder { color: var(--text-faint); }

  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--game-list-gap);
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
    padding: var(--game-card-inset-y) var(--game-card-inset-x);
    box-shadow: 0 0 0 1px var(--game-card-ring);
    font-size: var(--font-body);
    min-height: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .game-card input,
  .game-card textarea {
    user-select: text;
    -webkit-user-select: text;
  }

  .game-card--detail {
    width: 100%;
    height: auto;
    max-height: none;
    overflow: visible;
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

  .game-card__phase-stack {
    position: relative;
    display: grid;
    flex: 0 1 auto;
    min-height: 0;
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

  .game-detail-body {
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
    flex: 0 1 auto;
    min-height: 0;
  }

  .game-detail-players {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .game-detail-players__label,
  .progress-bar__label {
    margin: 0;
    font-size: var(--font-label);
    font-weight: 500;
    letter-spacing: 0;
    color: var(--text-subtle);
    font-family: var(--font-mono);
  }

  .game-detail-players--empty .chip-list__empty {
    color: var(--text-muted);
    line-height: 1.45;
    font-family: var(--font-sans);
  }

  .game-detail-players--locked {
    gap: var(--space-1);
    padding-top: var(--space-1);
    border-top: 1px solid var(--card-ring);
    opacity: 0.88;
    overflow: visible;
    pointer-events: auto;
  }

  .game-card--live .game-detail-players--locked {
    animation: gameDetailLockIn 0.4s ease 0.08s both;
  }

  @keyframes gameDetailLockIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 0.88; transform: translateY(0); }
  }

  .progress-bar__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .progress-bar__count {
    font-size: var(--font-label);
    color: var(--text-subtle);
    font-family: var(--font-mono);
  }

  .progress-bar__track {
    height: 5px;
    background: var(--btn-bg);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }

  .progress-bar__fill {
    height: 100%;
    border-radius: var(--radius-pill);
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-bar__fill--go {
    background: linear-gradient(90deg, #22c55e, #4ade80);
  }

  .progress-bar__fill--warn {
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
  }

  .progress-bar__fill--low {
    background: linear-gradient(90deg, #ef4444, #f87171);
  }

  .game-card__title-row {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    min-width: 0;
  }

  .game-card__title {
    margin: 0;
    font-size: var(--font-title);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
    min-width: 0;
  }

  .game-card__edit-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: var(--radius-sm);
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    cursor: pointer;
    line-height: 0;
  }

  .game-card__edit-btn:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .location-display {
    position: relative;
    display: inline;
  }

  .location-display__label {
    border-bottom: 1px dotted var(--text-faint);
  }

  .location-display--copyable {
    touch-action: manipulation;
  }

  .location-display--copyable .location-display__label {
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .location-display__copy-action {
    position: fixed;
    z-index: calc(var(--z-toast) + 2);
    margin: 0;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--card-ring);
    background: var(--card-bg);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-label);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .location-display__copy-action:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .location-display__tooltip {
    min-width: max-content;
    max-width: min(280px, calc(100vw - 24px));
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.4;
    white-space: normal;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .location-display__tooltip--floating {
    position: fixed;
    z-index: calc(var(--z-toast) + 1);
  }

  .game-card__detail {
    margin: 0 0 var(--space-3);
    font-size: var(--font-body);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    line-height: 1.4;
  }

  .game-card__divider {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--card-divider);
  }

  .game-card__actions {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
  }

  .game-card__actions--stacked {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .game-card__action {
    flex: 1;
    min-width: 0;
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

  .game-card__action--rsvp.game-card__action--saving {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .game-card__action--cancel,
  .game-card__action--bail {
    font-family: var(--font-mono);
  }

  .games-screen__admin-menu {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
  }

  .games-screen__admin-badge {
    font-size: 10px;
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: 'DM Mono', monospace;
    font-weight: 600;
    cursor: pointer;
  }

  .games-screen__admin-badge:focus:not(:focus-visible) {
    outline: none;
  }

  .games-screen__admin-badge:focus-visible {
    outline: 2px solid var(--card-ring);
    outline-offset: 2px;
  }

  .games-screen__add-game {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
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
    padding: var(--space-2) var(--space-3);
    font-size: 11px;
  }

  .games-screen__add-game-icon {
    line-height: 1;
  }

  .games-screen__admin-link {
    width: 26px;
    height: 26px;
    padding: 0;
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .games-screen__admin-logout-icon {
    width: 14px;
    height: 14px;
    display: block;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    border-radius: 999px;
    padding: var(--space-1) var(--space-3);
    font-family: 'DM Mono', monospace;
    font-weight: 600;
    font-size: var(--font-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
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

  .commit-status-pill {
    flex-shrink: 0;
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--chip-you-bg);
    border: 1px solid var(--chip-you-border);
    color: var(--chip-you-text);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .commit-status-pill--hidden {
    visibility: hidden;
  }

  .game-detail-header__title-row .commit-status-pill {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-label);
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

  .games-screen--detail {
    min-height: max(var(--min-viewport-height), 100dvh);
    height: auto;
    overflow: visible;
  }

  html:has(.games-screen--detail) {
    min-height: max(var(--min-viewport-height), 100dvh);
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }

  html:has(.games-screen--detail) body,
  html:has(.games-screen--detail) #root,
  html:has(.games-screen--detail) .app-shell {
    min-height: max(var(--min-viewport-height), 100dvh);
    height: auto;
    overflow: visible;
  }

  .games-screen--detail .games-screen__main--detail {
    overflow: visible;
    flex: 1 0 auto;
  }

  .games-screen--detail .game-detail-layout--responsive {
    flex: 0 1 auto;
  }

  .game-detail-layout {
    min-height: 0;
    width: 100%;
    max-width: min(var(--max-list), 100%);
    margin: 0 auto;
  }

  .game-detail-layout--responsive {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: var(--layout-stack-gap);
    justify-content: flex-start;
    padding-bottom: calc(var(--chat-bar-height, 58px) + env(safe-area-inset-bottom, 0px));
  }

  @media (min-width: 768px) {
    .game-detail-layout--responsive {
      padding-bottom: 0;
    }
  }

  .detail-height-shell {
    position: relative;
    width: 100%;
    flex-shrink: 0;
    overflow: hidden;
    isolation: isolate;
  }

  .detail-height-shell__panel {
    width: 100%;
  }

  .detail-height-shell__panel:not(.detail-height-shell__panel--inactive) {
    position: relative;
    z-index: 1;
  }

  .detail-height-shell__panel--inactive {
    position: absolute;
    top: 0;
    left: -100vw;
    width: 100%;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    contain: layout style paint;
  }

  .game-detail-panel {
    width: 100%;
    flex-shrink: 0;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: 0 0 0 1px var(--game-card-ring);
  }

  .game-detail-panel input,
  .game-detail-panel textarea {
    user-select: text;
    -webkit-user-select: text;
  }

  .game-detail-panel--rsvpd {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-detail-panel--here {
    box-shadow: 0 0 0 1px var(--status-go-color, #22c55e);
  }

  .game-detail-panel--live {
    box-shadow: 0 0 0 1px var(--card-ring-live);
  }

  .game-detail-panel--starting-soon {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-detail-panel--ended {
    box-shadow: 0 0 0 1px var(--game-card-ring);
    opacity: 0.92;
  }

  .game-detail-panel--cancelled {
    opacity: 0.45;
  }

  .game-detail-panel__actions {
    padding: var(--space-3) var(--game-card-inset-x) var(--game-card-inset-y);
    border-top: 1px solid var(--card-divider);
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
  }

  .game-detail-panel__cta--saving {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .game-card--embedded {
    background: transparent;
    box-shadow: none;
    padding: var(--game-card-inset-y) var(--game-card-inset-x);
    height: auto;
    font-size: var(--font-body);
    gap: var(--layout-stack-gap);
  }

  .game-detail-layout__thread {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 0 var(--space-1);
  }

  @media (max-width: 767px) {
    .games-screen--detail .games-screen__main--detail {
      flex: 1 1 0;
      min-height: 0;
    }

    .games-screen--detail .game-detail-layout--responsive {
      flex: 1 1 0;
      min-height: 0;
    }

    .game-detail-layout--responsive {
      gap: 0;
    }

    .game-detail-panel {
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }

    .game-detail-panel__actions {
      position: relative;
      z-index: 2;
      background: var(--card-bg);
    }

    .game-detail-layout__thread-wrap {
      flex: 1;
      min-height: 0;
      position: relative;
      z-index: 1;
    }

    .game-detail-layout__thread-wrap::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--chat-underlap);
      background: linear-gradient(to bottom, var(--bg), transparent);
      pointer-events: none;
      z-index: 2;
    }

    .game-detail-layout__thread {
      padding-left: var(--chat-thread-pad-left, var(--chat-bar-inset-x));
      padding-right: var(--chat-thread-pad-right, var(--chat-bar-inset-x));
      padding-bottom: 0;
      flex-direction: column-reverse;
      gap: var(--space-2);
    }

    .game-detail-layout__thread:has(.game-chat-thread__empty) {
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding-left: var(--chat-bar-inset-x);
      padding-right: var(--chat-bar-inset-x);
    }

    .game-detail-layout__thread .chat-message {
      margin-bottom: 0;
      flex-shrink: 0;
    }

    .game-chat-thread-shell {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .game-chat-thread__jump {
      position: absolute;
      left: 50%;
      bottom: var(--space-2);
      transform: translateX(-50%);
      z-index: 3;
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--card-ring);
      background: var(--card-bg);
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .game-chat-thread__jump:active {
      color: var(--text);
      border-color: var(--text-faint);
    }
  }

  .game-detail-layout__thread-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .game-detail-layout__thread-wrap--hidden {
    display: none;
  }

  .game-chat-thread__empty {
    margin: 0;
    padding: var(--space-5) var(--space-3);
    text-align: center;
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--font-body);
  }

  .game-detail-header {
    flex-shrink: 0;
  }

  .game-detail-header__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    min-width: 0;
  }

  .game-detail-header__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
  }

  .game-detail-header__title {
    margin: 0;
    font-size: var(--font-title);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }

  .game-detail-header__title-row .status-badge {
    flex-shrink: 0;
  }

  .game-detail-header__meta,
  .game-list-item__meta {
    margin: var(--space-1) 0 0;
  }

  .game-detail-header__countdown {
    display: inline-flex;
    margin-top: var(--space-1);
  }

  .game-list-item__starting-soon,
  .game-start-countdown {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--status-go-bg);
    border: 1px solid var(--status-go-color);
    color: var(--status-go-color);
    font-family: var(--font-mono);
    font-size: var(--font-label);
    font-weight: 600;
  }

  .game-start-countdown {
    background: var(--status-almost-bg);
    border-color: var(--status-almost-color);
    color: var(--status-almost-color);
  }

  .game-detail-header__row-wrap {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
  }

  .game-detail-header--collapsible .game-detail-header__row-wrap {
    margin: calc(-1 * var(--space-1));
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .game-detail-header--collapsible .game-detail-header__row-wrap:focus-visible {
    outline: 2px solid var(--chip-you-border);
    outline-offset: 2px;
  }

  .game-detail-header--collapsible .game-detail-header__row-wrap:focus:not(:focus-visible) {
    outline: none;
  }

  .game-detail-header__caret-slot {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .game-detail-header__caret {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm);
    color: var(--text-subtle);
    transition: transform 0.2s ease, color 0.15s ease;
  }

  .game-detail-header__caret--open {
    transform: rotate(180deg);
  }

  .game-commit-strip {
    flex-shrink: 0;
    padding: var(--game-card-inset-y) var(--game-card-inset-x);
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
    font-size: var(--font-body);
  }

  .game-commit-strip .game-detail-header__title-row .status-badge {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-label);
  }

  .game-commit-strip__expandable {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
  }

  .game-commit-strip--expanded .game-commit-strip__expandable {
    grid-template-rows: 1fr;
  }

  .game-commit-strip__expandable-inner {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
    min-height: 0;
  }

  .presence-layer {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: var(--z-presence);
  }

  .presence-layer--wide-only {
    display: none;
  }

  @media (min-width: 768px) {
    .presence-layer--wide-only {
      display: block;
    }
  }

  .speech-bubble--draft {
    opacity: 0.72;
    border-style: dashed !important;
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
    padding: var(--layout-gutter);
    width: 100%;
    box-sizing: border-box;
  }

  .games-screen__main--landing {
    align-items: flex-start;
    padding-top: var(--space-3);
  }

  .games-screen__main--detail {
    align-items: stretch;
    justify-content: flex-start;
    flex-direction: column;
    padding: var(--layout-gutter-detail);
    overflow: hidden;
  }

  .games-screen__empty {
    text-align: center;
    margin: auto;
  }

  .games-screen__empty-text {
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    margin: 0 0 var(--space-3);
  }

  .app-header {
    display: flex;
    align-items: center;
    padding: var(--layout-gutter) var(--layout-gutter) 0;
    flex-shrink: 0;
    gap: var(--layout-inline-gap);
    position: relative;
    z-index: calc(var(--z-presence) + 2);
  }

  .app-header__center {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .app-header__leading {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    min-width: 0;
  }

  .app-header__brand {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    min-width: 0;
  }

  .app-header__logo {
    font-size: var(--font-display);
    line-height: 1;
  }

  .app-header__title {
    font-size: var(--font-title);
    font-weight: 700;
  }

  .app-header__title--tappable {
    user-select: none;
    -webkit-user-select: none;
  }

  .app-header__back {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
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
    gap: var(--space-3);
    flex-shrink: 0;
    margin-left: auto;
  }

  .watching-cluster {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    max-width: 100%;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    opacity: 0.92;
    pointer-events: auto;
    cursor: default;
  }

  .watching-cluster__dots {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .watching-cluster__dot {
    width: var(--space-2);
    height: var(--space-2);
    border-radius: 50%;
    border: 1.5px solid var(--bg);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent);
    flex-shrink: 0;
  }

  .watching-cluster__dot + .watching-cluster__dot,
  .watching-cluster__dot + .watching-cluster__overflow {
    margin-left: -3px;
  }

  .watching-cluster__overflow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    margin-left: -2px;
    border-radius: 999px;
    background: var(--toggle-bg);
    border: 1.5px solid var(--bg);
    font-size: 9px;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text-subtle);
    line-height: 1;
  }

  .watching-cluster__label {
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--text-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 420px) {
    .watching-cluster {
      padding: var(--space-1) var(--space-2);
    }
  }

  .app-header__profile {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .app-header__profile:focus:not(:focus-visible) {
    outline: none;
  }

  .app-header__profile:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
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
    font-size: var(--font-label);
    color: var(--header-muted);
    font-family: 'DM Mono', monospace;
  }

  .game-list {
    display: flex;
    flex-direction: column;
    gap: var(--game-list-gap);
    width: 100%;
    max-width: min(var(--max-list), 92vw);
    margin: 0 auto;
  }

  .game-list-item {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: var(--game-card-inset-y) var(--game-card-inset-x);
    box-shadow: 0 0 0 1px var(--game-card-ring);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .game-list-item:focus:not(:focus-visible) {
    outline: none;
  }

  .game-list-item:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 2px;
  }

  .game-list-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 0 1px var(--text-subtle);
  }

  .game-list-item--live {
    box-shadow: 0 0 0 1px var(--card-ring-live);
  }

  .game-list-item--live:hover {
    box-shadow: 0 0 0 1px var(--card-ring-live);
  }

  .game-list-item--rsvpd {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-list-item--rsvpd:hover {
    box-shadow: 0 0 0 1px var(--card-ring-active);
  }

  .game-list-item--cancelled {
    opacity: 0.45;
  }

  .game-list-item__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .game-list-item__title-wrap {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    min-width: 0;
    flex: 1;
  }

  .game-list-item__title {
    margin: 0;
    font-size: var(--font-title);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
  }

  .game-list-item__badges {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    flex-shrink: 0;
  }

  .game-list-item__footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--card-divider);
  }

  .game-list-item__count {
    font-size: var(--font-label);
    color: var(--text-subtle);
    font-family: var(--font-mono);
  }

  .game-list-item__live {
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-list-item__ended {
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-detail-header__live {
    display: inline-flex;
    margin-top: var(--space-1);
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-detail-header__starting-soon {
    display: inline-flex;
    margin-top: var(--space-1);
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--status-go-bg);
    border: 1px solid var(--status-go-color);
    color: var(--status-go-color);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-detail-header__ended {
    display: inline-flex;
    margin-top: var(--space-1);
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-2);
    border-radius: 999px;
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-list-item__countdown {
    flex-shrink: 0;
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
    width: 100%;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .game-detail .game-card {
    width: 100%;
    flex: 0 1 auto;
    min-height: 0;
  }

  @container game-detail (max-width: 380px) {
    .game-detail-header__title-row .status-badge {
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-label);
    }
  }

  @media (max-width: 480px) {
    .app-header__title {
      display: none;
    }

    .app-header__profile-name {
      display: none;
    }

    .games-screen__add-game-label {
      display: none;
    }

    .games-screen__add-game--header {
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 16px;
    }

    .meta-row__period-text {
      display: none;
    }
  }

  .chat-bar-anchor {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-chat);
    display: flex;
    justify-content: center;
    padding: var(--chat-bar-anchor-inset) var(--chat-bar-inset-x)
      calc(var(--chat-bar-anchor-inset) + env(safe-area-inset-bottom, 0px));
    pointer-events: none;
    transition: none;
  }

  .chat-bar-anchor--detail {
    padding-top: var(--space-2);
    padding-left: max(var(--chat-bar-inset-x), env(safe-area-inset-left, 0px));
    padding-right: max(var(--chat-bar-inset-x), env(safe-area-inset-right, 0px));
  }

  .chat-bar-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: min(100%, var(--max-list));
    pointer-events: auto;
  }

  .chat-alerts-link {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-faint);
    font-size: 11px;
    font-family: var(--font-mono);
    line-height: 1.3;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in srgb, var(--text-faint) 55%, transparent);
    -webkit-tap-highlight-color: transparent;
  }

  .chat-alerts-link:hover:not(:disabled) {
    color: var(--text-subtle);
    text-decoration-color: currentColor;
  }

  .chat-alerts-link:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .chat-alerts-link--muted {
    text-decoration: none;
    cursor: default;
    pointer-events: none;
  }

  .chat-bar {
    pointer-events: auto;
  }

  @media (min-width: 768px) {
    .chat-bar-anchor {
      left: auto;
      right: 0;
      justify-content: flex-end;
      padding: var(--chat-bar-anchor-inset);
      padding-bottom: calc(var(--chat-bar-anchor-inset) + env(safe-area-inset-bottom, 0px));
      pointer-events: auto;
    }

    .chat-bar-anchor--detail {
      padding-left: var(--chat-bar-anchor-inset);
      padding-right: max(var(--chat-bar-anchor-inset), env(safe-area-inset-right, 0px));
    }

    .chat-bar-stack {
      width: min(var(--chat-bar-width-wide), calc(100vw - 2 * var(--chat-bar-anchor-inset)));
      align-items: flex-end;
    }

    .chat-bar {
      width: 100%;
    }
  }

  .presence-connecting {
    position: fixed;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
