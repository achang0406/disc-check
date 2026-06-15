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

  @media (max-width: ${BP_SM_MIN - 1}px) {
    :root {
      --layout-gutter: var(--space-4);
      --layout-gutter-detail: var(--space-4);
      --chat-bar-inset-x: var(--space-4);
      --game-carousel-peek: 12px;
    }
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
    height: auto;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: none;
  }

  html {
    min-height: -webkit-fill-available;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body, #root {
    min-height: -webkit-fill-available;
  }

  .app-shell {
    height: auto;
    overflow: visible;
  }

  .loading-screen {
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-modal) + 30);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    color: var(--text);
    opacity: 1;
    transition: opacity 0.48s ease;
    padding-top: var(--safe-area-top);
    padding-bottom: var(--safe-area-bottom);
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
    min-width: 0;
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
    overflow-wrap: anywhere;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .location-display__tooltip--floating {
    position: fixed;
    z-index: calc(var(--z-toast) + 1);
  }

  .games-screen__admin-menu {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
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
    position: absolute;
    left: calc(100% + var(--layout-inline-gap));
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
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
    height: auto;
    display: flex;
    flex-direction: column;
    overflow: visible;
    box-sizing: border-box;
  }

  .games-screen--landing .games-screen__main--landing {
    flex: 0 1 auto;
    min-height: 0;
  }

  /*
   * Group detail: at least viewport-tall so the chat thread can flex with screen size.
   * Page scroll stays enabled; only the message list scrolls inside the thread.
   */
  .games-screen.games-screen--group {
    min-height: 100dvh;
    height: auto;
    overflow: visible;
  }

  html.ios-standalone .games-screen.games-screen--group {
    min-height: 100vh;
  }

  .games-screen.games-screen--group .games-screen__main--detail {
    flex: 1 1 0;
    min-height: 0;
    overflow: visible;
  }

  .group-games-screen__top {
    flex-shrink: 0;
    width: 100%;
  }

  .games-screen.games-screen--group .group-games-screen__chat-zone {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: var(--chat-zone-min-height, 10rem);
    width: 100%;
    max-width: var(--content-rail-width);
    margin-inline: auto;
  }

  .group-games-screen__chat-zone .game-detail-layout__thread-wrap {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
  }

  .group-games-screen__chat-zone .game-detail-layout__thread {
    flex: 1 1 0;
    min-height: 0;
    max-height: none;
    height: auto;
  }

  .group-games-screen__chat-zone .chat-bar-anchor--detail {
    flex-shrink: 0;
  }

  .games-screen--detail .games-screen__main--detail {
    flex: 0 1 auto;
    min-height: 0;
  }

  .games-screen--detail .game-detail-layout--responsive {
    flex: 0 1 auto;
    min-height: 0;
  }

  .game-detail-layout {
    min-height: 0;
    width: 100%;
    max-width: var(--content-rail-width);
    margin-inline: auto;
  }

  .game-detail-layout--responsive {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: var(--chat-thread-gap);
    justify-content: flex-start;
  }

  .game-detail-panel {
    position: relative;
    z-index: 2;
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
    position: relative;
    z-index: 2;
    background: var(--card-bg);
    padding: var(--space-3) var(--game-card-inset-x) var(--game-card-inset-y);
    border-top: 1px solid var(--card-divider);
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
  }

  .game-chat-push {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }

  .game-chat-push__hint {
    position: absolute;
    top: calc(100% + var(--space-1));
    right: 0;
    margin: 0;
    width: max-content;
    max-width: min(14rem, calc(100vw - var(--game-card-inset-x) * 2 - var(--space-4)));
    text-align: right;
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--font-label);
    line-height: 1.35;
    white-space: normal;
    word-break: break-word;
    pointer-events: none;
    z-index: 3;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 140ms ease,
      visibility 140ms ease;
  }

  .game-chat-push--hint-visible .game-chat-push__hint {
    opacity: 1;
    visibility: visible;
  }

  .game-chat-push--error .game-chat-push__hint {
    color: var(--status-almost-color, #d97706);
  }

  .game-chat-push--on:not(.game-chat-push--error) .game-chat-push__hint {
    color: var(--text-subtle);
  }

  .game-chat-push__icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--toggle-border);
    border-radius: var(--radius-pill);
    background: var(--toggle-bg);
    color: var(--text-muted);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      color 120ms ease,
      background 120ms ease,
      border-color 120ms ease,
      opacity 120ms ease;
  }

  .game-chat-push__icon-btn:hover:not(:disabled) {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .game-chat-push__icon-btn:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 2px;
  }

  .game-chat-push__icon-btn--on {
    color: var(--chip-you-text);
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
  }

  .game-chat-push__icon-btn--loading {
    opacity: 0.7;
    cursor: wait;
  }

  .game-chat-push__icon-btn:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .game-chat-push__icon-btn--on:not(:disabled) {
    opacity: 1;
  }

  .game-chat-push__icon-svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  .game-detail-panel__cta--saving {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .game-detail-panel__cta.btn--secondary {
    transition: opacity 0.12s ease;
  }

  .game-detail-layout__thread-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    position: relative;
    z-index: 1;
  }

  .group-games-screen__chat-zone .game-detail-layout__thread-wrap {
    z-index: 2;
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
    position: relative;
    display: flex;
    flex-direction: column-reverse;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    gap: var(--chat-thread-gap);
    padding-left: var(--chat-bar-inset-x);
    padding-right: var(--chat-bar-inset-x);
    padding-bottom: 0;
    scroll-padding-bottom: var(--chat-thread-gap);
  }

  .game-detail-layout__thread:has(.game-chat-thread__empty),
  .game-detail-layout__thread:has(.game-chat-thread__loading) {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-left: var(--chat-bar-inset-x);
    padding-right: var(--chat-bar-inset-x);
    padding-bottom: var(--chat-thread-gap);
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

  .game-chat-thread__latest-anchor {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    flex-shrink: 0;
    pointer-events: none;
  }

  .game-chat-thread__jump {
    position: absolute;
    left: 50%;
    bottom: var(--space-2);
    transform: translateX(-50%);
    z-index: calc(var(--z-chat) - 1);
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

  .game-chat-thread__empty,
  .game-chat-thread__loading {
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

  .game-detail-header__live-badge {
    flex-shrink: 0;
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--status-almost-bg);
    border: 1px solid var(--status-almost-color);
    color: var(--status-almost-color);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-detail-header__ended-badge {
    flex-shrink: 0;
    font-size: var(--font-label);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--btn-bg);
    border: 1px solid var(--card-ring);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .game-detail-header__admin-action {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
  }

  .game-detail-header__meta {
    margin: var(--space-1) 0 0;
  }

  .game-detail-header__countdown {
    display: inline-flex;
    margin-top: var(--space-1);
  }

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

  .game-commit-card {
    container-type: inline-size;
    container-name: game-detail;
  }

  .game-commit-card .game-detail-header {
    flex-shrink: 0;
  }

  .game-commit-strip {
    flex: 1;
    min-height: 0;
    padding: var(--game-card-inset-y) var(--game-card-inset-x) 0;
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
    font-size: var(--font-body);
    overflow: hidden;
  }

  .game-commit-strip__actions {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    margin-top: auto;
    background: var(--card-bg);
    padding: 0 var(--game-card-inset-x) var(--game-card-inset-y);
    display: flex;
    flex-direction: column;
    gap: var(--layout-stack-gap);
  }

  .game-commit-strip__tour-anchor {
    min-height: 52px;
    box-sizing: border-box;
  }

  .game-commit-strip .game-detail-header__title-row .status-badge {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-label);
  }

  .game-commit-card .game-detail-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .game-commit-strip__players {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding-top: var(--space-2);
    gap: var(--layout-stack-gap);
    overflow: hidden;
  }

  .game-commit-card .live-pickup {
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--layout-stack-gap);
    overflow: hidden;
  }

  .game-commit-card .game-detail-players {
    flex: 0 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-1);
  }

  .game-commit-card .chip-list {
    flex-wrap: nowrap;
    align-items: center;
    min-height: var(--game-commit-chip-row-height);
    overflow-x: auto;
    overflow-y: visible;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .game-commit-card .chip-list::-webkit-scrollbar {
    display: none;
  }

  .game-commit-card .chip-list__empty {
    min-height: var(--game-commit-chip-row-height);
    display: flex;
    align-items: center;
    line-height: 1.3;
  }

  .game-commit-card .chip-list .chip {
    flex-shrink: 0;
  }

  .games-screen__main {
    flex: 0 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    padding: var(--layout-gutter);
    width: 100%;
    box-sizing: border-box;
  }

  .games-screen__main--landing {
    align-items: flex-start;
    padding-top: var(--space-3);
  }

  .group-list-item__description {
    margin: 0 0 var(--space-2);
    color: var(--text-subtle);
    font-size: 14px;
    line-height: 1.45;
  }

  .group-list-item__summary {
    margin: 0;
    color: var(--text-faint);
    font-size: 13px;
    font-family: var(--font-mono);
  }

  .group-games-screen__intro {
    width: 100%;
    max-width: var(--content-rail-width);
    margin-inline: auto;
    margin-bottom: var(--space-3);
  }

  .group-games-screen__intro:has(+ .group-games-screen__cards .game-cards-carousel__dots) {
    margin-bottom: 0;
  }

  .group-games-screen__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .group-games-screen__title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .group-games-screen__description {
    margin: 0 0 var(--space-2);
    color: var(--text-subtle);
    font-size: 15px;
    line-height: 1.5;
    max-width: 60ch;
  }

  .group-games-screen__bell {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    overflow: visible;
  }

  .group-games-screen__cards {
    flex-shrink: 0;
    width: 100%;
    overflow: visible;
    position: relative;
    z-index: 0;
    isolation: isolate;
  }

  .game-cards-carousel {
    width: 100vw;
    max-width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    overflow: visible;
    padding-block: 1px;
  }

  .game-cards-carousel__track {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
    height: var(--game-carousel-slot-height);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: var(--game-carousel-edge-pad);
    padding-inline: var(--game-carousel-edge-pad);
    padding-block: 1px;
    margin-block: -1px;
    scrollbar-width: none;
  }

  .game-cards-carousel__track::-webkit-scrollbar {
    display: none;
  }

  .game-cards-carousel__slide {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 0 0 var(--game-carousel-slide-width);
    min-width: 0;
    min-height: 0;
    scroll-snap-align: center;
    padding-block: 1px;
    margin-right: var(--game-carousel-gap);
    box-sizing: border-box;
  }

  .game-cards-carousel__slide .game-detail-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
    width: 100%;
  }

  .game-cards-carousel .game-detail-panel {
    z-index: auto;
  }

  .game-cards-carousel__slide:last-child {
    margin-right: 0;
  }

  .game-cards-carousel__slide--peek .game-commit-card {
    pointer-events: none;
    opacity: 0.92;
  }

  .game-cards-carousel__focus-hit {
    position: absolute;
    inset: 0;
    z-index: 4;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    display: none;
    pointer-events: none;
  }

  .game-cards-carousel__slide--peek .game-cards-carousel__focus-hit {
    display: block;
    pointer-events: auto;
  }

  .game-cards-carousel__focus-hit:focus:not(:focus-visible) {
    outline: none;
  }

  .game-cards-carousel__focus-hit:focus-visible {
    outline: 2px solid var(--text-muted);
    outline-offset: 2px;
  }

  @media (max-width: ${BP_SM_MIN - 1}px) {
    .game-cards-carousel__slide--peek .game-commit-card {
      opacity: 0.92;
    }
  }

  .game-cards-carousel__dots {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    margin: 0 auto var(--space-3);
    padding: 0;
  }

  .game-cards-carousel__dot {
    width: 18px;
    height: 3px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--text-faint);
    opacity: 0.35;
    cursor: pointer;
    transition:
      width 0.2s ease,
      opacity 0.15s ease,
      background 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .game-cards-carousel__dot--active {
    width: 28px;
    opacity: 1;
    background: var(--text-muted);
  }

  .game-cards-carousel__dot:focus:not(:focus-visible) {
    outline: none;
  }

  .game-cards-carousel__dot:focus-visible {
    outline: 2px solid var(--text-muted);
    outline-offset: 2px;
  }

  .game-cards-carousel--static .game-cards-carousel__track {
    overflow-x: hidden;
    scroll-snap-type: none;
    justify-content: center;
  }

  .game-cards-carousel--static .game-cards-carousel__slide {
    margin-right: 0;
  }

  .game-card-empty__meta {
    color: var(--text-subtle);
  }

  .game-card-empty__meta .meta-row__text {
    font-size: var(--font-body);
  }

  .install-app-link {
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

  .install-app-link:hover:not(:disabled) {
    color: var(--text-subtle);
    text-decoration-color: currentColor;
  }

  .install-app-link:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .install-app-help {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.5;
  }

  .install-app-help strong {
    color: var(--text-subtle);
    font-weight: 600;
  }

  .install-app-help li + li {
    margin-top: var(--space-2);
  }

  .games-screen__main--detail {
    align-items: stretch;
    justify-content: flex-start;
    flex-direction: column;
    padding-top: var(--layout-gutter-detail);
    padding-bottom: 0;
    padding-inline: var(--game-carousel-edge-pad);
    overflow: visible;
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
    padding: calc(var(--layout-gutter) + var(--safe-area-top)) var(--layout-gutter) 0;
    padding-left: calc(var(--layout-gutter) + var(--safe-area-left));
    padding-right: calc(var(--layout-gutter) + var(--safe-area-right));
    flex-shrink: 0;
    gap: var(--layout-inline-gap);
    position: relative;
    z-index: calc(var(--z-presence) + 2);
  }

  .app-header__center {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .app-header__center:empty {
    display: none;
  }

  .app-header__center--install:not(:has(.install-app-link)) {
    display: none;
  }

  .app-header__center .install-app-link {
    pointer-events: auto;
    flex-shrink: 0;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .app-header__leading {
    display: flex;
    align-items: center;
    gap: var(--layout-inline-gap);
    min-width: 0;
    flex: 0 1 auto;
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
    flex: 0 0 auto;
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

  .game-list-item__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .game-list-item__title {
    margin: 0;
    font-size: var(--font-title);
    font-weight: 700;
    color: var(--text-strong);
    line-height: 1.2;
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

  .game-list-item__cta {
    margin-left: auto;
    color: var(--text-faint);
    font-size: 16px;
    line-height: 1;
  }

  @container game-detail (max-width: 380px) {
    .game-detail-header__title-row .status-badge {
      padding: var(--space-1) var(--space-2);
      font-size: var(--font-label);
    }
  }

  @media (max-width: ${BP_SM_MIN - 1}px) {
    .app-header__title,
    .app-header__profile-name,
    .games-screen__add-game-label {
      display: none;
    }

    .games-screen__add-game--header {
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 16px;
    }
  }

  @media (max-width: 480px) {
    .meta-row__period-text {
      display: none;
    }
  }

  .chat-bar-anchor--detail {
    position: relative;
    flex-shrink: 0;
    z-index: var(--z-chat);
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 0 var(--chat-bar-inset-x) max(var(--chat-bar-inset-y), var(--safe-area-bottom));
    padding-left: max(var(--chat-bar-inset-x), var(--safe-area-left));
    padding-right: max(var(--chat-bar-inset-x), var(--safe-area-right));
    pointer-events: none;
  }

  .chat-bar-stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    width: 100%;
    max-width: var(--content-rail-width);
    pointer-events: auto;
  }

  .chat-bar {
    pointer-events: auto;
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

  .walkthrough-layer {
    position: fixed;
    z-index: 220;
    pointer-events: none;
    font-family: var(--font-sans);
    color: var(--text);
  }

  .walkthrough-scrim {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  .walkthrough-scrim--full {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.78);
  }

  .walkthrough-scrim__spotlight {
    transition:
      x 0.22s ease,
      y 0.22s ease,
      width 0.22s ease,
      height 0.22s ease;
  }

  .walkthrough-bubble {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    padding: var(--space-3);
    padding-top: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
    pointer-events: auto;
    font-family: var(--font-sans);
    color: var(--text);
    transition:
      top 0.22s ease,
      left 0.22s ease,
      width 0.22s ease;
  }

  .walkthrough-bubble__dismiss {
    position: absolute;
    top: var(--space-1);
    right: var(--space-1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-faint);
    font-family: var(--font-sans);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .walkthrough-bubble__dismiss:hover {
    color: var(--text-subtle);
    background: color-mix(in srgb, var(--card-ring) 45%, transparent);
  }

  .walkthrough-bubble__dismiss:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 1px;
  }

  .walkthrough-bubble--below::before,
  .walkthrough-bubble--above::before {
    content: "";
    position: absolute;
    left: var(--walkthrough-tail-x, 50%);
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border: 12px solid transparent;
    filter: drop-shadow(0 0 0 var(--card-ring));
  }

  .walkthrough-bubble--below::before {
    top: -24px;
    border-bottom-width: 16px;
    border-bottom-color: var(--card-bg);
  }

  .walkthrough-bubble--above::before {
    bottom: -24px;
    border-top-width: 16px;
    border-top-color: var(--card-bg);
  }

  .walkthrough-bubble--below::after,
  .walkthrough-bubble--above::after {
    content: "";
    position: absolute;
    left: var(--walkthrough-tail-x, 50%);
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border: 13px solid transparent;
    pointer-events: none;
  }

  .walkthrough-bubble--below::after {
    top: -26px;
    border-bottom-width: 17px;
    border-bottom-color: var(--card-ring);
    z-index: -1;
  }

  .walkthrough-bubble--above::after {
    bottom: -26px;
    border-top-width: 17px;
    border-top-color: var(--card-ring);
    z-index: -1;
  }

  .walkthrough-bubble__dots {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 var(--space-2);
    padding-right: var(--space-4);
  }

  .walkthrough-bubble__dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-faint) 40%, transparent);
  }

  .walkthrough-bubble__dot--active {
    width: 18px;
    background: var(--text-subtle);
  }

  .walkthrough-bubble__title {
    margin: 0 0 var(--space-2);
    color: var(--text-strong);
    font-family: var(--font-sans);
    font-size: var(--font-title);
    font-weight: 700;
    line-height: 1.25;
  }

  .walkthrough-bubble__body {
    margin: 0 0 var(--space-3);
    padding-right: var(--space-4);
    color: var(--text-subtle);
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.55;
    white-space: pre-line;
  }

  .walkthrough-bubble__nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }

  .walkthrough-bubble__nav--solo {
    justify-content: flex-end;
  }

  .walkthrough-bubble__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--card-ring);
    background: var(--card-bg);
    color: var(--text-subtle);
    font-family: var(--font-sans);
    font-size: var(--font-label);
    font-weight: 500;
    line-height: 1.2;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .walkthrough-bubble__btn:hover {
    color: var(--text);
    border-color: var(--text-faint);
  }

  .walkthrough-bubble__btn:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 1px;
  }

  .walkthrough-bubble__btn--next {
    border-color: color-mix(in srgb, var(--rsvp-btn-border) 70%, var(--card-ring));
    background: color-mix(in srgb, var(--rsvp-btn-bg) 55%, var(--card-bg));
    color: var(--text);
  }

  .walkthrough-bubble__btn--next:hover {
    border-color: var(--rsvp-btn-border);
    background: color-mix(in srgb, var(--rsvp-btn-bg) 75%, var(--card-bg));
  }

  .walkthrough-bubble--centered::before,
  .walkthrough-bubble--centered::after {
    display: none;
  }

`;
