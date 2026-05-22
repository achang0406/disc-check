# DiscCheck design system

Shared tokens, theme roles, and UI components keep the app visually consistent as features grow.

## Tokens (`src/styles/tokens.js`)

Injected on `:root` via `useTheme`. Use CSS variables — not hardcoded pixels — in new styles.

| Category | Examples |
|----------|----------|
| Spacing | `--space-1` … `--space-5` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |
| Type | `--font-sans`, `--font-mono`, `--font-body`, `--font-label`, `--font-display` |
| Layout | `--max-modal`, `--max-detail` |
| Z-index | `--z-modal`, `--z-toast` |

## Theme colors (`src/styles/themes.js`)

Semantic roles, not raw hex in components:

- **Surfaces:** `--card-bg`, `--card-ring`, `--card-ring-live`
- **Text:** `--text`, `--text-strong`, `--text-muted`, `--text-subtle`, `--text-faint`
- **Actions:** `--rsvp-btn-*`, `--cancel-btn-text`
- **Status:** `--status-go-*`, `--status-almost-*`, `--status-not-*`
- **Chips:** `--chip-*`, `--chip-you-*`

Light/dark palettes swap these values; components stay the same.

## Shared CSS (`src/styles/ui.css.js`)

Global class patterns imported into `theme.js`:

| Class | Use |
|-------|-----|
| `.surface` | Cards, list rows — bg + ring + radius |
| `.btn` + `.btn--*` | All buttons (`primary`, `secondary`, `danger`, `ghost`, `icon`) |
| `.modal*` | Modal shell layout |
| `.field*` | Form labels, inputs, errors |
| `.meta-row*` | Location + schedule metadata lines |
| `.chip*` | Player name pills |
| `.empty-state*` | Empty lists |
| `.toast*` | Feedback messages |

## UI components (`src/components/ui/`)

Prefer these over one-off markup:

| Component | When |
|-----------|------|
| `Button` | Any clickable action; `block` for full-width card actions |
| `ModalShell` | All modals — title, description, body, footer slots |
| `Field` | Label + input + optional error |
| `MetaRow` | Schedule line (time · slot · type); location row uses `.meta-row--location` inline |
| `ChipList` | RSVP / check-in player lists |
| `EmptyState` | No games, no results |

## Game-specific layout

- **Landing:** `GameListItem` = `.surface` + location row + `MetaRow` + footer stats
- **Detail:** `GameCard` = `.surface.game-card--detail` + phase stack (RSVP ↔ live)
- **Responsive:** `@container game-detail` hides secondary metadata below 380px (city, slot, type, section labels)

## Adding new UI

1. Check if a token or existing class covers the need.
2. If reusable, add to `ui.css.js` and optionally a thin component in `components/ui/`.
3. Use theme color vars only — no `#hex` in feature code.
4. Match existing font roles: DM Sans for UI copy, DM Mono for metadata and labels.

## Modals

All modals use `ModalShell`:

```jsx
<ModalShell
  title="…"
  description="…"
  onClose={onClose}
  footer={<Button variant="primary">Save</Button>}
>
  <Field label="…">…</Field>
</ModalShell>
```

Validation errors: one `.field__error` at the bottom of the body (see `GameFormModal`).
