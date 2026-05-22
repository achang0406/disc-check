# DiscCheck design system

Shared tokens, theme roles, and UI components keep the app visually consistent as features grow.

## Tokens (`src/styles/tokens.js`)

Injected on `:root` via `useTheme`. Use CSS variables — not hardcoded pixels — in new styles.

| Category | Examples |
|----------|----------|
| Spacing | `--space-1` … `--space-6` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |
| Type | `--font-sans`, `--font-mono`, `--font-body`, `--font-label`, `--font-title`, `--font-display` |
| Layout | `--max-modal`, `--max-detail`, `--max-list` |
| Breakpoints | `--bp-wide-min` (768px), `--bp-compact-max` (767px) |
| Z-index | `--z-modal`, `--z-presence`, `--z-chat`, `--z-toast` |

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
| `.chat-message*` | Compact-layout chat thread bubbles |

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

## Responsive layout

**Breakpoint-based only — never device type.** Use viewport width via `@media (min-width: 768px)` or the JS hook `useBreakpoint()` (reads the same threshold from `src/constants/breakpoints.js`). Do not use `(pointer: coarse)`, user-agent sniffing, or “mobile-only” naming.

| Layout | Viewport | Detail page |
|--------|----------|-------------|
| **Compact** | `< 768px` | Pinned `GameCommitStrip` + scrollable `GameChatThread` + `ChatBar` |
| **Wide** | `≥ 768px` | Full `GameCard` + cursor speech bubbles (`PresenceLayer`) |

- **CSS-first:** Both layout shells can exist in the DOM; `@media` toggles `.game-detail-layout--wide` vs `--compact`, `.presence-layer--wide-only`, `.chat-bar--compact-only`.
- **JS for behavior only:** `useBreakpoint().isWide` drives presence mode (`cursor` vs `thread`) and global keyboard capture.
- **Container queries:** Use `@container` for component-level density (e.g. wide card metadata), not for choosing layout mode.

### Checklist for new features

1. Tokens in `tokens.js` if new spacing/type/breakpoint values are needed
2. Reusable classes in `ui.css.js`
3. Thin component in `components/ui/` if markup repeats
4. Test at 767px and 768px widths (resize browser — not a specific device)

## Game-specific layout

- **Landing:** `GameListItem` = `.surface` + location row + `MetaRow` + footer stats
- **Detail (wide):** `GameCard` = `.surface.game-card--detail` + phase stack (RSVP ↔ live)
- **Detail (compact):** collapsible `GameCommitStrip` + `GameChatThread` — expand for location, schedule, players, plus-ones
- **Responsive (wide card):** `@container game-detail` hides secondary metadata below 380px container width

## Chat patterns

| Layout | UI | Persistence |
|--------|-----|-------------|
| Wide | Ephemeral cursor speech bubbles; type anywhere (global keyboard) | 3s TTL |
| Compact | Standard thread + bottom `ChatBar` | In-session only |

Presence is scoped per game: `disc-check:presence:{gameId}`.

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
