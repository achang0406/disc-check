---
name: Phase 3c check-in pushes
overview: "Add Phase 3c: full four-tier milestone ladders for pregame RSVP (incl. 1.5×/2× surge) and live check-in; pregame named guests; rsvp_* / checkin_* rename; latest-only coalescing per phase."
status: implemented
migration: "041"
---

# Phase 3c — Live check-in milestone pushes

See full plan: event types `rsvp_*` (pregame), `checkin_*` (live), `phase_live` (kickoff). Same `process-push-outbox` cron. Migration `041_checkin_badge_milestones.sql`.

## Milestone ladders (both phases, same thresholds)

| Rank | Threshold | Pregame event | Live event |
|------|-----------|---------------|------------|
| ALMOST | `>= max(1, target − 2)` | `rsvp_almost` | `checkin_almost` |
| GAME ON | `>= target` | `rsvp_go` | `checkin_go` |
| 1.5× | `>= ceil(target × 1.5)` | `rsvp_surge_some` | `checkin_live_some` |
| 2× | `>= ceil(target × 2)` | `rsvp_surge_full` | `checkin_live_full` |

Pregame headcount: `rsvp_headcount + pregame_guest_count`. Live headcount: check-ins + live walk-ins. Coalesce latest-only **within each family** (`rsvp_*` vs `checkin_*`).

## Push copy

| Event | Body |
|-------|------|
| `rsvp_almost` | `{Game} — Almost a go! {need} more and we're on.` |
| `rsvp_go` | `{Game} — We're on! See you there.` |
| `rsvp_surge_some` | `{Game} — RSVP surge — subs are stacking up!` |
| `rsvp_surge_full` | `{Game} — Huge turnout brewing! Sub lines filling fast.` |
| `phase_live` | `{Game} — We're live! Tap I'm here when you land.` |
| `checkin_almost` | `{Game} — Almost there — {need} more here and we're on!` |
| `checkin_go` | `{Game} — We're on! Game's happening now.` |
| `checkin_live_some` | `{Game} — Crowd's building — subs are stacking!` |
| `checkin_live_full` | `{Game} — Packed house, sub lines full. Get out there and play!` |
