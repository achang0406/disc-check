---
name: Intent-aligned push refactor v2 rollout
overview: Phased re-implementation of the intent-aligned push refactor in small, reversible PRs. PR1 stops per-message chat push, renames the bell, and deletes notify-chat; PR2 adds notify-push plumbing; game coordination events follow via thin outbox + cron (no heavy sync triggers on RSVP/chat writes).
status: planned
note: Derisked rollout after v1 revert. Reference spec at docs/intent-aligned-push-refactor-plan.md; rollback template at scripts/supabase-rollback-push-plan.sql.
---

# Incremental push refactor (derisked v2)

Reference: archived spec in [intent-aligned-push-refactor-plan.md](intent-aligned-push-refactor-plan.md), lessons from revert + [scripts/supabase-rollback-push-plan.sql](../scripts/supabase-rollback-push-plan.sql).

## Goals

- Ship **small PRs** with independent rollback and clear pass/fail tests.
- **Remove per-message chat push in PR 1** — stop client invoke, rename bell to “Game alerts,” delete unused [`notify-chat`](../supabase/functions/notify-chat/index.ts); keep `push_subscriptions` registration.
- **Add shared push infrastructure in PR 2** — `notify-push`, SW gate, deep links; still no automatic game pushes until PR4+.
- **Core push line ends at PR6** (cancel, live, badge) — no announcements in the main path.
- Defer **announcements** (in-app banner + push) to **optional PR8–PR9**, immediately before chatter.
- Defer **`chat_chatter` summary** to **optional PR10** (last).
- Avoid v1 performance traps: **no heavy SQL on RSVP/chat write path**, **no new full-`fetchAppData` Realtime subscription**.

## PR map at a glance

| PR | Track | One-line summary |
|----|-------|------------------|
| **PR1** | Required | **Chat removal** — stop per-message push, rename bell to “Game alerts,” delete `notify-chat`. Subscriptions still register; nothing auto-sends yet. |
| **PR2** | Required | **Push plumbing** — `notify-push` + `pushSend`, SW visibility gate, deep links (`?game=`), `gameBadge.js`. Manual test pushes only. |
| **PR3** | Required | **Outbox + cron (idle)** — `push_outbox` tables and `process-push-outbox` every 2 min. Pipeline wired; queue empty until PR4+. |
| **PR4** | Required | **Game cancelled** — first auto-push when admin sets `open` → `cancelled`. |
| **PR5** | Required | **Game is live** — cron detects phase flip to live (~2 min lag). |
| **PR6** | Required | **RSVP badge** — cron detects `badge_almost` / `badge_go` tier upgrades (~2 min lag). **Core game-alert line ends here.** |
| **PR7** | Orthogonal | **Group limits** — max 7 games, one per weekday. Anytime after PR2; unrelated to push. |
| **PR8** | Optional | **Announcement banner** — in-app admin composer + banner on focused carousel slide. |
| **PR9** | Optional | **Announcement push** — OS notification when admin posts (after PR8, or skip). |
| **PR10** | Optional | **Chatter summary** — at most one push/hour when 2+ people chatted (last optional chunk). |

### Release tracks

```text
Required:  PR1 → PR2 → PR3 → PR4 → PR5 → PR6
           PR1 = turn off chat push
           PR2–PR3 = wire the pipes
           PR4–PR6 = game coordination notifications (cancel, live, badge)

Orthogonal: PR7 anytime after PR2

Optional:  PR8 → PR9 → PR10  (announcements → chatter)
```

## Risk levels

| Level | Meaning |
|-------|---------|
| **Low** | Small diff, no DB write-path changes, easy rollback, unlikely to affect page responsiveness |
| **Low–Medium** | Noticeable product or ops change, but limited blast radius or rare code paths |
| **Medium** | Touches hot paths, new cron/scan work, or UI layout; needs staging + latency checks |
| **Medium–High** | Optional/deferred; reintroduces chat-related push logic |

### PR risk summary

| PR | Risk | Primary concern |
|----|------|-----------------|
| PR1 | Low–Medium | Stop chat push; bell rename; delete unused notify-chat |
| PR2 | Low–Medium | notify-push + SW/deep links/gameBadge (no notify-chat left) |
| PR3 | Low | Idle DB + cron only |
| PR4 | Low–Medium | First live game push; thin DB trigger on admin cancel |
| PR5 | Low | Cron-only scan; no write triggers |
| PR6 | Medium | Cron badge scan; must not regress RSVP feel |
| PR7 | Low–Medium | Schema constraint; admin create/edit only |
| PR8 | Medium | Optional — announcement banner UI + Realtime; carousel layout |
| PR9 | Low–Medium | Optional — announcement push on admin post |
| PR10 | Medium | Optional — chatter summary; chat activity path |

## Architecture (v2)

```mermaid
flowchart TD
  subgraph pr1 [PR1 Remove chat push]
    StopInvoke[Stop notifyChatPush in usePresence]
    BellRename[Game alerts bell copy]
    DelNotifyChat[Delete notify-chat edge fn]
  end
  subgraph pr2 [PR2 Plumbing]
    Bell[Game alerts bell]
    Subs[push_subscriptions]
    PushSend[pushSend.ts]
    NotifyPush[notify-push]
    SW[sw.js visibility gate]
    Bell --> Subs
  end
  subgraph writes [Thin writes PR4+]
    Cancel[games.status cancel]
  end
  subgraph optionalLate [Optional PR8 to PR9]
    AdminRPC[admin_post_announcement]
  end
  subgraph cron [Cron every 2 min PR3+]
    Processor[process-push-outbox]
    BadgeScan[badge tier scan]
    LiveScan[phase_live scan]
    ChatterScan[chatter scan PR10]
  end
  subgraph outbox [push_outbox]
    Queue[queued events]
  end
  StopInvoke -.->|"subscriptions kept"| Subs
  Cancel -->|"INSERT minimal row"| Queue
  Processor --> BadgeScan
  Processor --> LiveScan
  AdminRPC -->|"INSERT minimal row"| Queue
  Processor --> ChatterScan
  BadgeScan --> Queue
  LiveScan --> Queue
  ChatterScan --> Queue
  Processor --> NotifyPush
  NotifyPush --> PushSend
  PushSend --> SW
```

**Key change from v1:** badge, `phase_live`, and `chat_chatter` are **cron-computed** (or enqueue minimal hints), not synchronous triggers on `rsvps` / `group_chat_messages`.

---

## PR 1 — Remove per-message chat push (ship first)

**Risk: Low–Medium** — Stops chat push and removes dead `notify-chat` edge function; no DB, no SW changes. Rollback is restore client + redeploy `notify-chat`.

**User-visible:** chat still works in-app; OS notifications stop for every message. Bell copy becomes “Game alerts”; `push_subscriptions` still register (no pushes fire until PR2+).

### Client

| Change | Files |
|--------|-------|
| Remove `notifyChatPush` call after send | [src/hooks/usePresence.js](../src/hooks/usePresence.js) |
| Delete `notifyChatPush` export | [src/lib/push.js](../src/lib/push.js) |
| Rename bell copy; dispatch `disc-check-push-changed` | [src/components/games/GroupChatPushButton.jsx](../src/components/games/GroupChatPushButton.jsx) |
| Listen for `disc-check-push-changed` | [src/hooks/useChatAlerts.js](../src/hooks/useChatAlerts.js) |

### Edge

- **Delete** [supabase/functions/notify-chat/index.ts](../supabase/functions/notify-chat/index.ts) from repo
- Remove `notify-chat` from Supabase project (no replacement yet — bell registers subscriptions only)

### Explicitly out of scope

- `notify-push`, `pushSend.ts` (PR2 — extract send logic from git history of `notify-chat`)
- SW visibility gate, deep links, `gameBadge.js`

### Verify

- Chat works in-app; **no** per-message push (foreground or background)
- Bell shows “Game alerts” copy; on/off still registers `push_subscriptions`
- RSVP/chat latency unchanged
- `notify-chat` absent from Supabase functions list

### Rollback

- Restore `notifyChatPush` + bell copy; redeploy `notify-chat` to Supabase and Vercel

---

## PR 2 — Push plumbing foundation

**Risk: Low–Medium** — Adds `notify-push` send path + SW/deep-link polish; still **no automatic game pushes** until PR4+.

**User-visible:** no copy change (bell already “Game alerts” from PR1). Manual/test pushes work via `notify-push`.

### Client

| Change | Files |
|--------|-------|
| Add `buildGameDeepLink` | [src/lib/push.js](../src/lib/push.js) |
| SW: skip `showNotification` when any client `visible` | [src/sw.js](../src/sw.js) |
| Deep link: preserve `?game=` on notification open | [src/hooks/useServiceWorkerNavigation.js](../src/hooks/useServiceWorkerNavigation.js) |
| Shared badge tier helper (UI only) | new [src/utils/gameBadge.js](../src/utils/gameBadge.js), [src/components/games/StatusBadge.jsx](../src/components/games/StatusBadge.jsx) |

### Edge

- Add [supabase/functions/_shared/pushSend.ts](../supabase/functions/_shared/pushSend.ts) (extract VAPID send + exclude list from pre-PR1 `notify-chat` in git history)
- Add [supabase/functions/notify-push/index.ts](../supabase/functions/notify-push/index.ts) (thin POST → `pushSend`)
- Deploy `notify-push` to Supabase

### Docs

- Update [.env.example](../.env.example): `notify-push` secrets; remove `notify-chat`

### Verify

- Bell on/off still registers `push_subscriptions`
- Manual `notify-push` POST (service role) delivers one test notification when bell on
- SW visibility gate: no banner when PWA foreground
- Still no automatic pushes from app actions

### Rollback

- Delete `notify-push`; revert PR2 client/SW changes (PR1 `notify-chat` removal unchanged unless full rollback)

---

## PR 3 — Outbox infrastructure (idle)

**Risk: Low** — New tables, functions, and cron with no write triggers; outbox empty in normal use. Main ops risk is misconfigured cron (fixable without app deploy).

**No write triggers.** Cron runs but outbox stays empty except manual tests.

### Migration `030_push_outbox.sql` (use **030+** — 026–029 exist in remote migration history)

- Tables: `push_outbox`, `game_push_state`, `chat_push_state`
- SQL: `enqueue_push_event(...)` (full title/body/tag/url copy from v1 spec)
- **No** triggers on `rsvps`, `games`, `group_chat_messages` yet

### Edge + cron

- [supabase/functions/process-push-outbox/index.ts](../supabase/functions/process-push-outbox/index.ts): drain outbox → `pushSend`
- Migration `031_push_outbox_cron.sql`: schedule `disc-check-process-push-outbox` every 2 min (mirror prior [029 pattern](../scripts/supabase-rollback-push-plan.sql) with vault secret)

### Scripts

- Add `scripts/supabase-rollback-030-push-outbox.sql` (unschedule cron, drop tables/functions)

### Verify

- RSVP/chat latency unchanged vs PR1 baseline
- Cron logs show `processed: 0` runs
- Manual SQL `enqueue_push_event` → notification in background

---

## PR 4 — First game event: `game_cancelled`

**Risk: Low–Medium** — First end-to-end game push; thin trigger on rare admin `status` change only. Low write-path cost; validates full pipeline before hotter events.

Low-frequency, easy to test; proves end-to-end.

### Migration `032_game_cancelled_push.sql`

- **Thin trigger** on `games` `AFTER UPDATE OF status` when `open` → `cancelled`:
  - Only `PERFORM enqueue_push_event('game_cancelled', ...)`
  - No extra aggregates

### Verify

- Admin cancels game → one push per subscriber (background)
- In-app cancel UI unchanged

### Rollback

- Drop trigger only; outbox infra remains

---

## PR 5 — `phase_live` (cron-only)

**Risk: Low** — Cron scan only; no triggers on RSVP or chat. ~2 min delivery lag is acceptable; duplicate-push guard via `game_push_state`.

No RSVP triggers.

### Migration `033_phase_live_cron.sql`

- `enqueue_phase_live_events()` — scan open games where `is_game_live(...)` and `game_push_state.last_phase` ≠ `live` for current cycle
- Called from existing `process-push-outbox` (already designed in v1)

### Verify

- Near game start, one “Game is live” push per cycle (~2 min lag acceptable)
- No duplicate pushes same cycle

---

## PR 6 — Badge pushes (`badge_almost` / `badge_go`) — cron-based

**Risk: Medium** — Highest routine load in the push pipeline: cron scans games + RSVP headcounts every 2 min. Must confirm RSVP/chat UI stays snappy (v1 failed here with sync triggers).

**Critical derisk vs v1:** do **not** attach heavy `trg_rsvps_push_badge` on every RSVP write.

### Migration `034_badge_push_cron.sql`

- Cron function (or extend processor): for each pregame-open game, compute headcount + badge tier via SQL helpers (`compute_rsvp_headcount`, `compute_rsvp_badge`, `is_rsvp_open_for_game`)
- Compare to `game_push_state.last_rsvp_badge`; on **upgrade only** enqueue `badge_almost` / `badge_go`
- Upsert `game_push_state`

### Verify

- RSVP tap feels instant (same as before PR6)
- Badge flip push arrives within ~2 min in background
- No push during live/ended/stale cycle

---

## PR 7 — Group limits (orthogonal)

**Risk: Low–Medium** — DB unique constraint can fail deploy if duplicate weekdays exist; admin-only UX changes. No impact on player hot paths.

Can ship anytime after PR2; no push dependency.

### Migration `037_group_game_limits.sql`

- `UNIQUE (group_id, weekday)`, max 7 games in `admin_upsert_game`
- [src/components/ui/SelectField.jsx](../src/components/ui/SelectField.jsx) `option.disabled`
- [src/components/games/GameFormModal.jsx](../src/components/games/GameFormModal.jsx), [src/components/layout/AppHeader.jsx](../src/components/layout/AppHeader.jsx)

---

## PR 8 — Announcements in-app banner (optional)

**Risk: Medium** — New table, RPC, Realtime, and carousel UI. **Optional** — defer until PR1–PR6 are stable in prod. Mitigated by focused-slide-only layout and no full-`fetchAppData` subscription (v1 regression source).

Avoid v1 carousel/slide-stack regression.

### Migration `035_game_announcements.sql`

- `game_announcements` table + RLS + Realtime publication
- RPC `admin_post_game_announcement` — **upsert only**, no `enqueue_push_event` yet

### Client (performance-safe)

- Load announcements via **scoped fetch** in [src/lib/data.js](../src/lib/data.js) (can extend `fetchAppData` once, but **do not** add a 7th debounced full-refetch subscription)
- Prefer: Realtime handler patches a small `announcements` map for changed `game_id` only, or refetch single game row on admin post
- UI: banner + admin composer on **focused carousel slide only** (not inside every slide) — [src/screens/GroupGamesScreen.jsx](../src/screens/GroupGamesScreen.jsx)

### Verify

- Admin posts → banner on focused game; no carousel button regressions (Chrome mobile)
- No new push on post

---

## PR 9 — Announcement push (optional)

**Risk: Low–Medium** — Small RPC extension; push only on infrequent admin post. **Optional** — ship after PR8 banner is stable (or skip if banner is skipped).

### Migration `036_announcement_push.sql`

- Extend `admin_post_game_announcement` to `enqueue_push_event('announcement', ...)` with `exclude_subscriber_ids = ARRAY[p_subscriber_id]`

### Verify

- Non-admin with bell on gets push; posting admin excluded when backgrounded

---

## PR 10 — `chat_chatter` summary (optional, last)

**Risk: Medium** — Reintroduces chat-related push (summary only). **Optional** — defer until PR1–PR6 stable; ship after PR8–PR9 if announcements are included. Prefer cron scan; avoid v1 per-insert `COUNT(DISTINCT)` trigger.

**Cron-based**, not per-insert trigger.

### Migration `038_chat_chatter_cron.sql`

- Cron scans groups: distinct senders in 30 min ≥ 2, `chat_push_state.last_push_at` > 1h → enqueue `chat_chatter` with sender exclude list built from recent messages
- Alternatively maintain `chat_push_state.sender_count` via **light** insert trigger (single counter bump, no `COUNT(DISTINCT)` scan)

### Verify

- 2+ senders → at most one push/hour; no per-message spam

---

## Cross-cutting rules (every PR)

1. **One behavior change per PR** where possible.
2. **Per-PR rollback SQL** alongside forward migration (template: [scripts/supabase-rollback-push-plan.sql](../scripts/supabase-rollback-push-plan.sql)).
3. **Measure RSVP + chat latency** before/after any migration touching writes.
4. **Staging Supabase project** recommended for PR3+ before prod.
5. **Do not bundle** group limits, announcements UI, and push triggers in one PR.

## Suggested release order

```text
PR1 → PR2 → PR3 → PR4 → PR5 → PR6          (core game coordination pushes)
PR7 anytime after PR2                        (group limits, orthogonal)
PR8 → PR9 → PR10 optional last               (announcements banner → announcement push → chatter)
```

## Rollback script map

| PR | Forward migration | Rollback script |
|----|-------------------|-----------------|
| PR3 | `030_push_outbox.sql`, `031_push_outbox_cron.sql` | `scripts/supabase-rollback-030-push-outbox.sql` |
| PR4 | `032_game_cancelled_push.sql` | Drop trigger in per-PR rollback |
| PR5 | `033_phase_live_cron.sql` | Drop cron function hook in per-PR rollback |
| PR6 | `034_badge_push_cron.sql` | Drop badge scan in per-PR rollback |
| PR7 | `037_group_game_limits.sql` | Drop constraint + revert RPC |
| PR8 | `035_game_announcements.sql` | Drop table/RPC in per-PR rollback |
| PR9 | `036_announcement_push.sql` | Revert RPC to PR8 version |
| PR10 | `038_chat_chatter_cron.sql` | Drop chatter scan in per-PR rollback |

Full v1 rollback reference: [scripts/supabase-rollback-push-plan.sql](../scripts/supabase-rollback-push-plan.sql).

## Out of scope (unchanged from v1)

- `phase_starting_soon` push
- Badge downgrade on RSVP cancel
- `game_calls` / host override
