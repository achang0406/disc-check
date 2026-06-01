# DiscCheck design system

Shared tokens, theme roles, and UI components keep the app visually consistent as features grow.

## Tokens (`src/styles/tokens.js`)

Injected on `:root` via `useTheme`. Use CSS variables — not hardcoded pixels — in new styles.

| Category | Examples |
|----------|----------|
| Spacing | `--space-1` … `--space-6` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` |
| Type | `--font-sans`, `--font-mono`, `--font-body`, `--font-label`, `--font-title`, `--font-display` |
| Layout | `--max-modal`, `--max-detail`, `--max-list`, `--layout-gutter*`, `--layout-inline-gap`, `--layout-stack-gap`, `--game-card-inset-*`, `--game-list-gap`, `--chat-bar-inset-*` |
| Breakpoints | `--bp-sm-min` (640px), `--bp-md-min` (768px), `--bp-lg-min` (1024px), `--bp-xl-min` (1280px). Legacy: `--bp-wide-min`, `--bp-compact-max` |
| Z-index | `--z-modal`, `--z-presence`, `--z-chat`, `--z-toast` |

### Typography scale

Four steps on `:root`, overridden in `theme.js` at **sm** and **lg**. **md** (768px) is layout-only (GameCard vs commit strip). Micro UI (badges, pills ~10px) stays fixed.

| Token | Compact | ≥ sm (640px) | ≥ lg (1024px) |
|-------|---------|--------------|---------------|
| `--font-label` | 11px | 12px | 14px |
| `--font-body` | 13px | 14px | 16px |
| `--font-emphasis` | 15px | 16px | 18px |
| `--font-title` | 17px | 18px | 24px |
| `--font-display` | 22px | 24px | 28px |

At **lg**, each role shifts up one step (e.g. body becomes 16px — the former emphasis size).

### Layout scale

Stepped via spacing tokens — no fluid `clamp()` on gutters or insets.

| Token | Compact | ≥ sm (640px) | ≥ lg (1024px) |
|-------|---------|--------------|---------------|
| `--max-list`, `--max-detail` | 640px | 640px | 720px |
| `--layout-gutter` | `--space-3` (12px) | `--space-4` (16px) | `--space-5` (24px) |
| `--layout-gutter-detail` | `--space-3` | `--space-4` | `--space-5` |
| `--game-card-inset-*` | `--space-3` | `--space-4` | `--space-5` |
| `--layout-stack-gap` | `--space-2` (8px) | `--space-2` | `--space-3` (12px) |
| `--layout-inline-gap` | `--space-2` | `--space-2` | `--space-3` |
| `--game-list-gap` | `--space-3` | `--space-3` | `--space-4` (16px) |
| `--chat-bar-inset-x` | `--space-3` | (inherits sm) | (inherits lg gutter) |
| `--chat-bar-inset-y` | `--space-2` | (inherits) | (inherits) |

Use `var(--font-title)` / `var(--font-body)` for headings and body text. Prefer `--layout-inline-gap` and `--layout-stack-gap` over raw `8px` / `12px` gaps.

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

**Breakpoint-based only — never device type.** Use viewport width via `@media (min-width: …)` or `src/constants/breakpoints.js` (`BP_*_MIN`, `MQ_*`). Do not use `(pointer: coarse)`, user-agent sniffing, or “mobile-only” naming.

| Name | Min width | CSS token | Use |
|------|-----------|-----------|-----|
| **Compact** | (default) | — | Phone-first base; tighter gutters (`--space-3`) |
| **sm** | 640px | `--bp-sm-min` | Type + layout step (`--space-4` gutters/insets) |
| **md / wide** | 768px | `--bp-md-min` | GameCard vs commit strip layout |
| **lg** | 1024px | `--bp-lg-min` | Large type + layout step (`--space-5`, 720px content) |
| **xl** | 1280px | `--bp-xl-min` | Reserved for future wide layout |

| Layout | Viewport | Detail page |
|--------|----------|-------------|
| **Compact** | `< 768px` | Pinned `GameCommitStrip` + scrollable `GameChatThread` + `ChatBar` |
| **Wide** | `≥ 768px` | Full `GameCard` + same thread chat + `ChatBar` |

- **CSS-first:** Both layout shells can exist in the DOM; `@media` toggles `.game-detail-layout--wide` vs `--compact`.
- **JS for behavior only:** `useBreakpoint()` reads `MQ_WIDE` (768px) for layout mode only.
- **Container queries:** Use `@container` for component-level density (e.g. wide card metadata), not for choosing layout mode.

### Checklist for new features

1. Tokens in `tokens.js` if new spacing/type/breakpoint values are needed
2. Reusable classes in `ui.css.js`
3. Thin component in `components/ui/` if markup repeats
4. Test at 639/640px (sm step), 767/768px (layout switch), and 1023/1024px (lg step)

## Game-specific layout

- **Landing:** group intro strip + `GameListItem` with `CallPanel` (plain-language call) + location + `MetaRow` + footer stats
- **Detail (wide):** `GameCard` = `.surface.game-card--detail` + `CallPanel` + phase stack (RSVP ↔ live)
- **Detail (compact):** collapsible `GameCommitStrip` + `CallPanel` + `GameChatThread` — expand for location, schedule, players, plus-ones; live phase elevates `LivePickupPanel` outside the collapsible
- **Responsive (wide card):** `@container game-detail` hides secondary metadata below 380px container width

### CallPanel (`src/components/games/CallPanel.jsx`)

This week’s go/no-go in plain language, derived from RSVP/check-in headcount vs target. Uses `--status-go-*`, `--status-almost-*`, `--status-not-*` tokens. Pair with `StatusBadge` on detail views; use `compact` on list rows and during live phase.

Copy logic lives in `src/utils/gameCall.js` (`getCallHeadline`, `getCallSubline`).

## Chat patterns

One pattern on every viewport — scrollable `GameChatThread` + pinned `ChatBar`. No cursor speech bubbles or global keyboard capture.

| Surface | UI | Persistence |
|---------|-----|-------------|
| All viewports | Pinned `ChatBar` + scrollable `GameChatThread` | Supabase Realtime + local cache |

Phase-specific empty states: pre-game (“Who’s in tonight?”) vs live (“In your car? Tap I'm here, then say hi.”).

## Intent & inclusivity checklist

Before shipping player-facing UI, verify:

1. **Plain language first** — headline explains go/no-go without decoding badge jargon (`CallPanel` before badges)
2. **One primary action** — single `Button` `primary` + `block` per screen phase
3. **Phase-aware hierarchy** — pre-game emphasizes call + RSVP; live emphasizes who’s here + I'm here + chat
4. **Accessible status** — text + color for go/almost/not (not color alone)
5. **Welcoming copy** — sign-up, empty chat, and live check-in sublines assume zero app literacy
6. **Design tokens only** — no one-off hex; reuse `.surface`, `MetaRow`, `ProgressBar`, `ModalShell`

## Conventions

- **Spacing:** `--space-*` only; no magic numbers in component CSS
- **Type:** `--font-*` tokens; responsive steps at sm/lg
- **Layout gaps:** `--layout-inline-gap` (row), `--layout-stack-gap` (column)
- **Colors:** semantic theme roles from `themes.js`
- **Components:** reuse `Button`, `ModalShell`, `Field`, `MetaRow`, `ChipList`, `CallPanel` before inventing new patterns
