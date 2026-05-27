/** Shared UI component styles — use tokens + theme color vars only. */
export const uiStyles = `
  .surface {
    background: var(--card-bg);
    border-radius: var(--radius-lg);
    box-shadow: 0 0 0 1px var(--card-ring);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    font-family: var(--font-sans);
    font-size: var(--font-body);
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    transition: opacity 0.12s ease, border-color 0.12s ease, background 0.12s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .btn:focus:not(:focus-visible) {
    outline: none;
  }

  .btn:focus-visible {
    outline: 2px solid var(--text-faint);
    outline-offset: 2px;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .btn--block {
    flex: 1;
    min-width: 0;
  }

  .btn--primary {
    background: var(--rsvp-btn-bg);
    border-color: var(--rsvp-btn-border);
    color: var(--rsvp-btn-text);
  }

  .btn--secondary {
    background: var(--card-bg);
    border-color: var(--input-border);
    color: var(--text-subtle);
  }

  .btn--danger {
    background: var(--status-not-bg);
    border-color: var(--status-not-color);
    color: var(--cancel-btn-text);
  }

  .btn--ghost {
    background: transparent;
    border-color: var(--card-ring);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    font-size: 10px;
    padding: 2px var(--space-2);
    border-radius: var(--radius-pill);
  }

  .btn--icon {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: var(--radius-sm);
    background: var(--toggle-bg);
    border-color: var(--toggle-border);
    color: var(--text);
    font-size: 16px;
  }

  .btn-row {
    display: flex;
    gap: var(--space-2);
  }

  .btn-row--stack {
    flex-direction: column;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-5);
    background: var(--overlay);
  }

  .modal {
    width: 100%;
    max-width: var(--max-modal-sm);
    padding: var(--space-4) calc(var(--space-4) + 2px);
    border-radius: var(--radius-lg);
    background: var(--card-bg);
    box-shadow: 0 0 0 1px var(--card-ring);
  }

  .modal--wide {
    max-width: var(--max-modal);
  }

  .modal__title {
    margin: 0 0 var(--space-1);
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text-strong);
  }

  .modal__description {
    margin: 0 0 var(--space-5);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    color: var(--text-muted);
    line-height: 1.5;
  }

  .modal__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .modal__footer {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
  }

  .modal__footer--stack {
    flex-direction: column;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .field__label {
    font-size: var(--font-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .field__input,
  .input {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    color: var(--text);
    font-size: var(--font-body);
    font-family: var(--font-sans);
    width: 100%;
    outline: none;
  }

  .field__error {
    margin: 0;
    font-size: var(--font-label);
    color: var(--cancel-btn-text);
    font-family: var(--font-mono);
  }

  .field__hint {
    margin: 0;
    font-size: var(--font-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .phone-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .phone-field__remove {
    align-self: flex-start;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .plus-ones {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-1) 0;
  }

  .plus-ones--disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  .plus-ones__btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--card-ring);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-muted);
    font-size: 15px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }

  .plus-ones__btn:not(:disabled):hover {
    color: var(--text);
    background: var(--btn-bg);
    border-color: var(--btn-border);
  }

  .plus-ones__btn:focus {
    outline: none;
    background: var(--btn-bg);
    border-color: var(--btn-border);
    color: var(--text);
  }

  .plus-ones__btn:focus-visible {
    outline: 2px solid var(--chip-you-border);
    outline-offset: 2px;
  }

  .plus-ones__btn:focus:not(:focus-visible) {
    outline: none;
  }

  .plus-ones__btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .plus-ones__readout {
    min-width: 72px;
    text-align: center;
    font-family: var(--font-mono);
    font-size: var(--font-label);
    color: var(--text-muted);
    user-select: none;
  }

  .plus-ones__label {
    color: var(--text-subtle);
  }

  .commit-extras {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    min-height: 28px;
  }

  .commit-extras .plus-ones {
    flex: 1;
    justify-content: flex-start;
    padding: 0;
    min-width: 0;
  }

  .bringing-kit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    padding: 0 11px;
    border: 1px solid var(--card-ring);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-label);
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    appearance: none;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      color 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .bringing-kit:not(.bringing-kit--on):hover,
  .bringing-kit:not(.bringing-kit--on):focus,
  .bringing-kit:not(.bringing-kit--on):active {
    color: var(--text-subtle);
    background: var(--btn-bg);
    border-color: var(--btn-border);
  }

  .bringing-kit:focus {
    outline: none;
  }

  .bringing-kit:focus-visible {
    outline: 2px solid var(--chip-you-border);
    outline-offset: 2px;
  }

  .bringing-kit:focus:not(:focus-visible) {
    outline: none;
  }

  .bringing-kit--on {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--chip-you-border) 35%, transparent);
  }

  .bringing-kit--on:hover,
  .bringing-kit--on:focus,
  .bringing-kit--on:active {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .bringing-kit--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .bringing-kit__icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .bringing-kit__label {
    white-space: nowrap;
  }

  .meta-row {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    min-width: 0;
  }

  .meta-row__text {
    min-width: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-row--location {
    color: var(--text-muted);
  }

  .meta-row__slot {
    color: var(--text-subtle);
  }

  .meta-row__period-icon {
    display: inline;
  }

  .meta-row--schedule {
    color: var(--text-subtle);
    margin-bottom: var(--space-3);
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .chip-list__empty {
    margin: 0;
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--font-body);
  }

  .chip {
    font-size: var(--font-body);
    line-height: 1.3;
    padding: var(--space-1) 10px;
    border-radius: var(--radius-pill);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    color: var(--chip-text);
    font-family: var(--font-mono);
    white-space: nowrap;
  }

  .chip--you {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .chip__muted {
    color: var(--text-subtle);
  }

  .chip--you .chip__muted {
    color: var(--chip-you-text);
    opacity: 0.9;
  }

  .game-walk-ins {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .live-pickup {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .live-pickup__lead {
    margin: 0;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.45;
  }

  .live-pickup__lead--subtle {
    color: var(--text-faint);
  }

  .live-pickup__here {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .live-pickup__here-list {
    gap: var(--space-1) var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--btn-bg) 72%, transparent);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--card-ring) 85%, transparent);
  }

  .live-pickup__rsvp-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-1);
    border-top: 1px solid color-mix(in srgb, var(--card-ring) 65%, transparent);
  }

  .live-pickup__waiting {
    margin: 0;
    color: var(--text-faint);
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.45;
  }

  .game-walk-ins__row {
    display: flex;
    gap: var(--space-2);
    align-items: stretch;
  }

  .game-walk-ins__input {
    flex: 1;
    min-width: 0;
  }

  .game-walk-ins__input:focus {
    border-color: var(--card-ring) !important;
    outline: none;
  }

  .game-walk-ins__list {
    flex-wrap: wrap;
    min-height: 0;
  }

  .chip--walk-in {
    background: var(--btn-bg);
    border-color: var(--card-ring);
    color: var(--text-subtle);
  }

  .walk-in-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .walk-in-chip__remove {
    border: none;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    font-size: var(--font-body);
    line-height: 1;
    padding: 0;
  }

  .walk-in-chip__remove:hover {
    color: var(--text-muted);
  }

  .toast {
    position: fixed;
    bottom: var(--space-5);
    left: var(--space-5);
    z-index: var(--z-toast);
    padding: var(--chat-bar-inset-y) var(--chat-bar-inset-x);
    border-radius: var(--radius-sm);
    font-size: var(--font-body);
    font-family: var(--font-mono);
    box-shadow: 0 0 0 1px var(--card-ring);
  }

  @media (max-width: 767px) {
    .toast {
      bottom: calc(
        var(--chat-bar-height, 0px) + var(--chat-bar-lift, 0px) + var(--chat-bar-inset-y)
      );
      left: var(--chat-bar-offset-left);
      max-width: calc(
        100vw - var(--chat-bar-offset-left) - var(--chat-bar-offset-right)
      );
    }
  }

  .toast--success {
    background: var(--status-go-bg);
    border-color: var(--status-go-color);
    color: var(--status-go-color);
  }

  .toast--error {
    background: var(--status-not-bg);
    border-color: var(--status-not-color);
    color: var(--cancel-btn-text);
  }

  .empty-state {
    text-align: center;
    margin: auto;
  }

  .empty-state__icon {
    font-size: var(--font-display);
    margin: 0 0 var(--space-2);
  }

  .empty-state__text {
    margin: 0 0 var(--space-3);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-body);
  }

  .chat-message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    margin-bottom: var(--space-2);
    max-width: 85%;
  }

  .chat-message--self {
    align-self: flex-end;
    align-items: flex-end;
  }

  .chat-message--system {
    align-self: center;
    align-items: center;
    max-width: 100%;
    margin: var(--space-2) 0;
  }

  .chat-message--system span {
    font-size: var(--font-label);
    color: var(--text-subtle);
    font-family: var(--font-mono);
    text-align: center;
  }

  .chat-message__name {
    font-size: 10px;
    color: var(--text-faint);
    font-family: var(--font-mono);
    padding: 0 var(--space-1);
  }

  .chat-message__bubble {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    color: var(--text);
    font-size: var(--font-body);
    line-height: 1.4;
    word-break: break-word;
  }

  .chat-message--self .chat-message__bubble {
    color: #0a0a0a;
  }
`;
