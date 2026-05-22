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

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .meta-row {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-body);
    line-height: 1.4;
  }

  .meta-row--location {
    color: var(--text-muted);
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
    font-size: inherit;
  }

  .chip {
    font-size: inherit;
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

  .chip__you-tag {
    color: var(--chip-you-text);
  }

  .toast {
    position: fixed;
    top: var(--space-5);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    padding: 10px var(--space-5);
    border-radius: var(--radius-sm);
    font-size: var(--font-body);
    font-family: var(--font-mono);
    box-shadow: 0 0 0 1px var(--card-ring);
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
`;
