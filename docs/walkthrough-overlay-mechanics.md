# Walkthrough overlay mechanics

Reference for how the group UX walkthrough cutout (spotlight) and step modal (bubble) are measured, positioned, and animated.

**Source of truth:** `src/components/walkthrough/WalkthroughOverlay.jsx`, walkthrough styles in `src/styles/theme.js`, step definitions in `src/constants/walkthrough.js`.

---

## 1. System overview

The walkthrough renders once per group when `useGroupWalkthrough` activates (first visit with games present). `GroupGamesScreen` mounts `WalkthroughOverlay` with the current step from `WALKTHROUGH_STEPS`.

Two layers share the viewport but are **not parent/child** and **not mechanically linked during animation**:

| Layer | DOM | Role |
|-------|-----|------|
| Scrim + cutout | Full-screen SVG + mask | Dims the page; transparent hole over target |
| Step modal | `position: fixed` div (`.walkthrough-bubble`) | Title, body, Back/Next |

Both are portaled to the app root via `getPortalTarget()`.

```
┌──────────────────────────────────────────── viewport ────┐
│  ████████████████ scrim (78% black) ████████████████████ │
│  ████┌──────────────┐███████████████████████████████████ │
│  ████│   cutout     │  ← SVG mask hole (spotlight)      │
│  ████└──────────────┘                                   │
│       ┌─────────────────┐                               │
│       │  step modal     │  ← fixed bubble + CSS tail    │
│       │  (Next / Back)  │                               │
│       └─────────────────┘                               │
└──────────────────────────────────────────────────────────┘
```

**Measurement pipeline:**

1. Find DOM node: `[data-walkthrough-target="…"]`
2. `getBoundingClientRect()` → target rect `R`
3. Derive spotlight `S` (cutout) and bubble layout `B` (modal) from `R`
4. On step change or scroll/resize, re-run measurement and let CSS transition from old → new values

---

## 2. Coordinate system and constants

All layout uses **viewport coordinates** (pixels from the top-left of the visual viewport), as returned by `getBoundingClientRect()`.

| Symbol / constant | Value | Meaning |
|-------------------|-------|---------|
| `P` (`DEFAULT_SPOTLIGHT_PAD`) | 8 | Default padding around target for cutout |
| `step.spotlightPad` | 4 | Tighter pad for chat + status steps |
| `BUBBLE_GAP` | 18 | Gap between cutout edge and modal |
| `VIEWPORT_PAD` | 12 | Minimum margin from screen edges |
| Max modal width | `min(340, innerWidth − 24)` | Bubble width cap |
| Tail clamp | 28 px | Min distance from modal left/right for pointer |
| `SETTLE_MS` | 220 | Delayed remeasure after step change |
| Transition duration | 0.22 s | Cutout + modal CSS transitions |
| Scrim opacity | 0.78 | `rgba(0, 0, 0, 0.78)` |
| Cutout corner radius | 10 | SVG `rx` / `ry` |

---

## 3. Target measurement

**Function:** `findTargetRect(step)`

- Reads `step.target` and optional `step.fallbackTarget`
- Returns the first matching element with `width > 0` and `height > 0`
- If nothing valid, overlay shows full scrim only (no hole, no bubble)

### Step → DOM anchors

| Step | `target` key | Element |
|------|--------------|---------|
| 1 — How a game works | `game-card` | `GameCommitCard` (carousel slide 0) |
| 2 — Bring friends | `walk-ins` | `GameDetailActions` panel (extras + CTA) |
| 3 — Rally the group | `chat-bar` | `ChatBar` composer field |
| 4 — Watch go/no-go | `game-status` | Status badge in `GameDetailHeader` |

Tour anchors are only present when `walkthroughAnchorActive` is true on the first carousel slide (`WALKTHROUGH_GAME_SLIDE_INDEX = 0`).

### Target rect `R`

From DOMRect:

- `R.left`, `R.top` — top-left of border box
- `R.width`, `R.height` — size
- `R.right = R.left + R.width`
- `R.bottom = R.top + R.height`
- `R.centerX = R.left + R.width / 2`

---

## 4. Cutout math (spotlight)

Given target rect `R` and pad `P` (from step or default):

```
S.x      = R.left − P
S.y      = R.top − P
S.width  = R.width + 2P
S.height = R.height + 2P
```

Edges:

```
S.left   = S.x
S.top    = S.y
S.right  = S.x + S.width  = R.right + P
S.bottom = S.y + S.height = R.bottom + P
```

Rendered as an SVG `<rect fill="black">` inside a mask. In SVG masks, **black = fully transparent** in the masked result, so this rect punches the hole through the scrim.

The scrim is a full-viewport rectangle with `mask="url(#…)"` applied.

---

## 5. Modal math (bubble layout)

**Function:** `getBubbleLayout(R, P)` → `{ width, left, top, placement, tailX }`

### 5.1 Horizontal position and width

```
bubbleWidth = min(340, window.innerWidth − 2 × VIEWPORT_PAD)

idealLeft = R.centerX − bubbleWidth / 2

bubble.left = clamp(idealLeft, VIEWPORT_PAD, innerWidth − VIEWPORT_PAD − bubbleWidth)
```

Center the modal on the target; clamp so the box stays on screen.

### 5.2 Tail horizontal offset

```
tailX = clamp(R.centerX − bubble.left, 28, bubbleWidth − 28)
```

`tailX` is the distance from the modal’s **left edge** to the pointer center. When the modal is clamped sideways, the tail shifts so it still points at `R.centerX`.

Exposed to CSS as `--walkthrough-tail-x`.

### 5.3 Above vs below

```
spaceBelow = innerHeight − (R.bottom + P)
spaceAbove = R.top − P

placeBelow = (spaceBelow ≥ 200) OR (spaceBelow ≥ spaceAbove)
```

- Prefer **below** when there is at least 200 px under the target, or more space below than above.
- Targets near the bottom of the screen (chat) usually get **above**.
- Mid-card targets (game card, walk-ins) usually get **below**.

### 5.4 Vertical position

**Below** (`placement: "below"`):

```
bubble.top = min(R.bottom + P + BUBBLE_GAP, innerHeight − VIEWPORT_PAD)
```

`top` is the **top edge** of the modal box. No CSS transform.

**Above** (`placement: "above"`):

```
bubble.top = max(VIEWPORT_PAD, R.top − P − BUBBLE_GAP)
```

Plus inline style: `transform: translateY(−100%)`.

Here `top` acts as an anchor for the **bottom edge** of the modal; the box extends upward.

### 5.5 Gap between cutout and modal

When placement is **below**:

```
cutout bottom = R.bottom + P
modal top     = R.bottom + P + BUBBLE_GAP   (before viewport clamp)

visual gap    = BUBBLE_GAP (18 px) in the ideal case
```

When placement is **above**:

```
cutout top    = R.top − P
modal bottom  ≈ R.top − P − BUBBLE_GAP

visual gap    ≈ BUBBLE_GAP (18 px)
```

---

## 6. Layout diagrams

### Below placement

```
        ┌─────────────────┐
        │     cutout      │  S.top .. S.bottom
        └────────┬────────┘
                 │ BUBBLE_GAP (18)
            ▲    │
            │    ▼
        ┌─────────────────┐
        │      modal      │  bubble.top = top edge
        └─────────────────┘
```

Tail (`::before`) sits at `top: −24px`, points **up** toward cutout.

### Above placement

```
        ┌─────────────────┐
        │      modal      │  translateY(−100%) from bubble.top
        └────────┬────────┘
                 │ BUBBLE_GAP
        ┌────────▼────────┐
        │     cutout      │
        └─────────────────┘
```

Tail sits at `bottom: −24px`, points **down** toward cutout.

---

## 7. Tail pointer (CSS only)

The pointer is not computed in JS beyond `tailX`. Triangles use `::before` (fill) and `::after` (border ring):

- `left: var(--walkthrough-tail-x); transform: translateX(−50%)`
- **Below:** `top: −24px`, upward triangle
- **Above:** `bottom: −24px`, downward triangle

Vertical tail offset (~24 px) is fixed in CSS, not derived from `BUBBLE_GAP`.

---

## 8. Relationship between cutout and modal

**At rest (no transition):** Both are computed from the same `R` and `P`, so the 18 px gap and tail aim are consistent.

**During step change:** There is **no shared anchor**. On `stepIndex` change:

1. `measureLayout()` runs immediately
2. React sets **final** new `S` and **final** new `B` in one update
3. CSS interpolates from the **previous painted** values to the new values over 220 ms

The modal does **not** follow the animated cutout frame-by-frame. It animates toward the new step’s formula independently.

---

## 9. Transition physics

### 9.1 CSS (theme.js)

**Cutout** (`.walkthrough-scrim__spotlight`):

```
transition: x 0.22s ease, y 0.22s ease, width 0.22s ease, height 0.22s ease;
```

**Modal** (`.walkthrough-bubble`):

```
transition: top 0.22s ease, left 0.22s ease, width 0.22s ease, transform 0.22s ease;
```

All four spotlight attributes morph **simultaneously**. That produces a combined move + resize (often perceived as “collapse” when height shrinks a lot).

### 9.2 Interpolation model

For each animated scalar property `v` (e.g. `S.x`, `bubble.top`):

```
v(t) = v_start + (v_end − v_start) × ease(t)    t ∈ [0, 1], duration 220 ms
```

`ease` is the browser’s default cubic-bezier for the `ease` keyword.

Cutout and modal each run their own lerp with **different start/end pairs**. There is no constraint like “modal.top = S.bottom + GAP” during `t ∈ (0, 1)`.

### 9.3 Why some step pairs feel bouncy (2→3, 3→4)

1. **Large Δheight and Δy** — walk-ins (tall) → chat bar (short, low on screen)
2. **Placement flip** — `below` ↔ `above` toggles `transform: translateY(−100%)` while `top` also changes
3. **Parallel morph** — cutout height shrinking while modal moves on a separate path
4. **220 ms remeasure** — `SETTLE_MS` timer fires when CSS transitions finish; a second layout pass can nudge positions if the DOM settled (carousel, fonts)

---

## 10. Remeasure lifecycle

| Trigger | Behavior |
|---------|----------|
| Step change | `measureLayout()` at t=0, t=220 ms, t=450 ms |
| Scroll (capture) | Debounced via `requestAnimationFrame` |
| Window resize | Updates viewport size + remeasure |
| `ResizeObserver` | Watches current step target element(s) |

**Fallback:** `displayLayout = layout ?? lastLayoutRef.current` keeps the last good bubble/cutout if the target temporarily has zero size.

**Blocked during experiments:** Any future “morph phase” state machine should skip remeasure while `phase !== steady` to avoid mid-animation jumps.

---

## 11. State and rendering notes

- `layout` holds `{ rect, bubble }`; spotlight is derived at render from `rect` and current `spotlightPad`
- Step **content** (title, body, dots) comes from the `step` prop and updates immediately on step change
- Bubble **position** updates when `measureLayout` runs (same step change tick as cutout target)
- Focus moves to the Next button when `layout` or `stepIndex` changes
- Escape calls `onSkip` (marks walkthrough complete in localStorage)

---

## 12. Tuning cheat sheet

Ideas for future polish (not all implemented):

| Goal | Approach |
|------|----------|
| Stop cutout “collapse” look | Transition only `x`/`y`; snap `width`/`height` |
| Staged cutout morph | Phase 1: partial or full `x`/`y`; phase 2: `width`/`height` |
| Collapse toward modal | Animate cutout to bubble tail anchor, then expand to new target |
| Reduce modal bounce | Delay bubble layout until cutout settles, or lock modal during cutout |
| Avoid double-hit at 220 ms | Skip remeasure if values unchanged or morph in progress |
| Keep modal glued to cutout | Derive bubble position from **animated** `S(t)` each frame |

---

## 13. File index

| File | Responsibility |
|------|----------------|
| `src/components/walkthrough/WalkthroughOverlay.jsx` | Measure, layout math, portal render |
| `src/styles/theme.js` | Scrim, cutout transitions, bubble, tail CSS |
| `src/constants/walkthrough.js` | Step copy, targets, `spotlightPad` overrides |
| `src/hooks/useGroupWalkthrough.js` | Step index, completion, localStorage |
| `src/screens/GroupGamesScreen.jsx` | Mount overlay, tour anchors on slide 0 |
