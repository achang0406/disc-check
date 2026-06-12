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
    pointer-events: auto;
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
    gap: var(--space-1);
  }

  .field__label {
    font-size: var(--font-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .field__input,
  .input {
    box-sizing: border-box;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    padding: var(--space-2) var(--space-3);
    color: var(--text);
    font-size: var(--font-body);
    font-family: var(--font-sans);
    line-height: 1.3;
    min-height: 42px;
    width: 100%;
    outline: none;
  }

  .field__input[type="time"],
  .field__input[type="number"],
  .field__input[type="date"] {
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.3;
    appearance: none;
    -webkit-appearance: none;
  }

  .field__input[type="number"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }

  .field__input[type="time"]::-webkit-datetime-edit,
  .field__input[type="time"]::-webkit-datetime-edit-fields-wrapper {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  .field__input[type="time"]::-webkit-calendar-picker-indicator {
    opacity: 0.7;
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

  .passcode-input {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
  }

  .passcode-input__digit {
    width: 3rem;
    height: 3.25rem;
    margin: 0;
    padding: 0;
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    background: var(--input-bg);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 1.35rem;
    font-weight: 600;
    line-height: 1;
    text-align: center;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .passcode-input__digit:focus {
    border-color: #22c55e;
  }

  .passcode-input__digit:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .phone-field {
    position: relative;
  }

  .phone-field__input {
    width: 100%;
  }

  .phone-field--clearable .phone-field__input {
    padding-right: calc(var(--space-4) + 14px);
  }

  .phone-field__clear {
    position: absolute;
    top: 50%;
    right: var(--space-2);
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-faint);
    font-size: var(--font-body);
    line-height: 1;
    cursor: pointer;
  }

  .phone-field__clear:hover:not(:disabled) {
    color: var(--text-muted);
    background: color-mix(in srgb, var(--btn-bg) 80%, transparent);
  }

  .phone-field__clear:focus:not(:focus-visible) {
    outline: none;
  }

  .phone-field__clear:focus-visible {
    outline: 2px solid var(--card-ring);
    outline-offset: 1px;
  }

  .phone-field__clear:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .composer-row {
    width: 100%;
  }

  .composer-field {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--card-bg);
    border: 1px solid var(--game-card-ring);
    border-radius: var(--radius-pill);
  }

  .composer-field:focus-within {
    border-color: color-mix(in srgb, var(--game-card-ring) 55%, var(--text-subtle));
  }

  .composer-field__input {
    flex: 1;
    min-width: 0;
    width: 100%;
    border: none;
    background: transparent;
    padding: var(--chat-bar-inset-y) calc(var(--space-2) + 32px) var(--chat-bar-inset-y)
      var(--chat-bar-inset-x);
    color: var(--text);
    font-size: max(16px, 1rem);
    line-height: 1.4;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    font-family: var(--font-sans);
    outline: none;
  }

  .composer-field__input:focus {
    font-size: max(16px, 1rem);
  }

  .composer-field__input::placeholder {
    color: var(--text-faint);
    font-size: max(16px, 1rem);
  }

  .composer-field__submit {
    position: absolute;
    top: 50%;
    right: var(--space-1);
    transform: translateY(-50%);
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-subtle);
    font-size: 17px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    appearance: none;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
    transition:
      color 0.15s ease,
      background 0.15s ease,
      opacity 0.15s ease;
  }

  .composer-field__submit:not(:disabled):hover,
  .composer-field__submit:not(:disabled):focus-visible {
    color: var(--status-go-color);
    background: color-mix(in srgb, var(--status-go-bg) 65%, var(--card-bg));
    outline: none;
  }

  .composer-field__submit:focus:not(:focus-visible) {
    outline: none;
  }

  .composer-field__submit:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .select-field {
    position: relative;
    width: 100%;
    container-type: inline-size;
    container-name: select-field;
  }

  .select-field__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    box-sizing: border-box;
    width: 100%;
    min-height: 42px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    background: var(--input-bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .select-field__trigger:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--input-border) 55%, var(--card-ring));
  }

  .select-field__trigger--open,
  .select-field__trigger:focus-visible {
    border-color: var(--status-go-color);
    outline: none;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--status-go-color) 35%, transparent);
  }

  .select-field__trigger:focus:not(:focus-visible) {
    outline: none;
  }

  .select-field__trigger:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .select-field__value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-field__value--placeholder {
    color: var(--text-faint);
  }

  .select-field__chevron {
    flex-shrink: 0;
    color: var(--text-muted);
    transition: transform 0.15s ease, color 0.15s ease;
  }

  .select-field__trigger--open .select-field__chevron {
    transform: rotate(180deg);
    color: var(--text-subtle);
  }

  .select-field__menu {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    z-index: 1;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    background: var(--card-bg);
    border: 1px solid var(--card-ring);
    border-radius: var(--radius-sm);
    box-shadow:
      0 8px 24px color-mix(in srgb, var(--overlay) 55%, transparent),
      0 0 0 1px color-mix(in srgb, var(--card-ring) 70%, transparent);
    max-height: 220px;
    overflow-y: auto;
  }

  .field__input--textarea {
    min-height: auto;
    line-height: 1.5;
  }

  .select-field__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: none;
    border-radius: calc(var(--radius-sm) - 2px);
    background: transparent;
    color: var(--text);
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .select-field__option-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-field__option-label--responsive .select-field__label-full {
    display: inline;
  }

  .select-field__option-label--responsive .select-field__label-short {
    display: none;
  }

  @container select-field (max-width: 8.75rem) {
    .select-field__option-label--responsive .select-field__label-full {
      display: none;
    }

    .select-field__option-label--responsive .select-field__label-short {
      display: inline;
    }
  }

  .select-field__option:hover,
  .select-field__option--highlighted {
    background: color-mix(in srgb, var(--btn-bg) 85%, transparent);
  }

  .select-field__option--selected {
    background: color-mix(in srgb, var(--status-go-bg) 70%, var(--card-bg));
    color: var(--text-strong);
  }

  .select-field__option--selected.select-field__option--highlighted {
    background: color-mix(in srgb, var(--status-go-bg) 85%, var(--card-bg));
  }

  .select-field__option--positive {
    color: var(--status-go-color);
  }

  .select-field__option--danger {
    color: var(--cancel-btn-text);
  }

  .select-field__option--disabled,
  .select-field__option--disabled:hover,
  .select-field__option--disabled.select-field__option--highlighted {
    opacity: 0.45;
    color: var(--text-faint);
    cursor: not-allowed;
    background: transparent;
  }

  .select-field__option:focus {
    outline: none;
  }

  .select-field__option:focus-visible {
    outline: 2px solid var(--chip-you-border);
    outline-offset: -1px;
  }

  .select-field__option:focus:not(:focus-visible) {
    outline: none;
  }

  .select-field__check {
    flex-shrink: 0;
    color: var(--status-go-color);
    font-size: var(--font-label);
    line-height: 1;
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
    gap: var(--space-2);
    height: 28px;
    padding: 0 var(--space-3);
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
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.4;
    min-width: 0;
  }

  .meta-row__text {
    display: block;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-row__part {
    display: inline;
  }

  .meta-row__part + .meta-row__part::before {
    content: "·";
    margin-left: var(--space-2);
    margin-right: var(--space-2);
    color: var(--text-faint);
  }

  .meta-row__slot::before {
    margin-right: var(--space-1);
  }

  .meta-row__time {
    font-family: var(--font-mono);
  }

  .meta-row--location {
    color: var(--text-muted);
  }

  .meta-row__slot {
    display: inline-flex;
    align-items: center;
    color: var(--text-subtle);
  }

  .meta-row__period-icon {
    display: inline-flex;
    flex-shrink: 0;
  }

  .meta-row__period-text {
    margin-left: var(--space-2);
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
    font-family: var(--font-sans);
    font-size: var(--font-body);
  }

  .chip {
    font-size: var(--font-body);
    line-height: 1.3;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--chip-bg);
    border: none;
    color: var(--chip-text);
    font-family: var(--font-sans);
    white-space: nowrap;
  }

  .chip--you {
    background: var(--chip-you-bg);
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
    font-family: var(--font-sans);
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
  }

  .live-pickup__rsvp-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-top: var(--space-1);
  }

  .live-pickup__waiting {
    margin: 0;
    color: var(--text-faint);
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.45;
  }

  .game-walk-ins__row {
    align-items: center;
  }

  .game-walk-ins__list {
    flex-wrap: wrap;
    min-height: 0;
  }

  .chip--walk-in {
    background: var(--btn-bg);
    color: var(--text-subtle);
  }

  .chip--removable {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding-right: var(--space-1);
  }

  .chip__remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    background: none;
    color: var(--text-faint);
    cursor: pointer;
    font-family: inherit;
    font-size: var(--font-body);
    line-height: 1;
    padding: var(--space-1);
    margin: calc(-1 * var(--space-1));
    border-radius: var(--radius-pill);
  }

  .chip__remove:hover {
    color: var(--text-muted);
    background: var(--chip-border);
  }

  @keyframes toast-enter {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(calc(-1 * var(--space-5)));
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes toast-exit {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .toast {
    position: fixed;
    top: calc(var(--safe-area-top) + var(--space-5));
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    max-width: min(var(--max-list), calc(100vw - 2 * var(--space-5)));
    padding: var(--chat-bar-inset-y) var(--chat-bar-inset-x);
    border-radius: var(--radius-sm);
    font-size: var(--font-body);
    font-family: var(--font-mono);
    box-shadow: 0 0 0 1px var(--card-ring);
    cursor: pointer;
    animation: toast-enter 0.28s ease-out both;
  }

  .toast--exit {
    animation: toast-exit 0.2s ease-in forwards;
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
    gap: var(--space-1);
    margin-bottom: var(--space-2);
    max-width: 85%;
    overflow: visible;
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

  .chat-message__bubble-wrap {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  .chat-message__bubble {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: var(--font-body);
    line-height: 1.4;
    word-break: break-word;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .chat-message__bubble--spotlight-source {
    visibility: hidden;
  }

  .chat-message--self .chat-message__bubble {
    background: var(--chip-you-bg);
    border-color: var(--chip-you-border);
    color: var(--chip-you-text);
  }

  .chat-message__reactions {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: 0;
    max-width: none;
    margin: 0;
    padding: 0;
    pointer-events: auto;
    transform: translate(20%, -42%);
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .chat-message--self .chat-message__reactions {
    right: auto;
    left: 0;
    justify-content: flex-start;
    transform: translate(-20%, -42%);
  }

  .chat-reaction {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    min-height: 22px;
    padding: 1px 4px;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--chip-border);
    box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.12));
    font-size: var(--font-label);
    line-height: 1;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  .chat-message__reactions .chat-reaction + .chat-reaction {
    margin-left: -8px;
  }

  .chat-message__reactions .chat-reaction:nth-child(1) {
    z-index: 1;
  }

  .chat-message__reactions .chat-reaction:nth-child(2) {
    z-index: 2;
  }

  .chat-message__reactions .chat-reaction:nth-child(3) {
    z-index: 3;
  }

  .chat-message__reactions .chat-reaction:nth-child(4) {
    z-index: 4;
  }

  .chat-message__reactions .chat-reaction:nth-child(n + 5) {
    z-index: 5;
  }

  .chat-reaction--mine {
    border-color: var(--chip-you-border);
    background: var(--chip-you-bg);
    color: var(--chip-you-text);
  }

  .chat-reaction--other {
    border-color: var(--chip-border);
    background: var(--chip-bg);
    color: var(--text);
  }

  .chat-reaction__emoji {
    font-size: 13px;
    line-height: 1;
  }

  .chat-reaction-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
  }

  .chat-reaction-spotlight {
    position: fixed;
    z-index: 1201;
    box-sizing: border-box;
  }

  .chat-reaction-spotlight .chat-message__bubble {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    box-shadow:
      0 0 0 9999px rgba(0, 0, 0, 0.45),
      0 8px 28px rgba(0, 0, 0, 0.22);
  }

  .chat-reaction-picker {
    position: fixed;
    z-index: 1202;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--chip-border);
    background: var(--surface-raised, var(--chip-bg));
    box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.18));
    overflow: hidden;
  }

  .chat-reaction-picker__scroll {
    display: flex;
    flex-wrap: nowrap;
    gap: 2px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 4px 6px;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .chat-reaction-picker__scroll::-webkit-scrollbar {
    display: none;
  }

  .chat-reaction-picker__btn {
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: var(--radius-md);
    background: transparent;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
    scroll-snap-align: start;
  }

  .chat-reaction-picker__btn:hover,
  .chat-reaction-picker__btn:focus-visible {
    background: var(--chip-bg);
  }

  @media (max-width: 767px) {
    .field__input,
    .input,
    .phone-field__input,
    .select-field__trigger,
    .select-field__option {
      font-size: max(16px, var(--font-body));
    }

    .field__input::placeholder,
    .input::placeholder,
    .phone-field__input::placeholder {
      font-size: max(16px, var(--font-body));
    }

    .field__input[type="time"]::-webkit-datetime-edit,
    .field__input[type="time"]::-webkit-datetime-edit-fields-wrapper {
      font-size: max(16px, var(--font-body));
    }
  }
`;
