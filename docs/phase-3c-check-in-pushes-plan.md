---
name: Phase 3c check-in pushes
overview: "Add Phase 3c: remove RSVP live 1.5×/2× (3b); add pregame named guests (separate from live walk-ins) into RSVP push headcount; wire live check-in + live walk-in headcount to a four-tier milestone ladder with latest-only coalescing."
status: planned
migration: "041"
---

# Phase 3c — Live check-in milestone pushes

See full plan: event types `rsvp_*` (pregame), `checkin_*` (live), `phase_live` (kickoff). Same `process-push-outbox` cron. Migration `041_checkin_badge_milestones.sql`.

## Push copy

| Event | Body |
|-------|------|
| `rsvp_almost` | `{Game} — Almost a go! {need} more and we're on.` |
| `rsvp_go` | `{Game} — We're on! See you there.` |
| `phase_live` | `{Game} — We're live! Tap I'm here when you land.` |
| `checkin_almost` | `{Game} — Almost there — {need} more here and we're on!` |
| `checkin_go` | `{Game} — We're on! Game's happening now.` |
| `checkin_live_some` | `{Game} — Crowd's building — subs are stacking!` |
| `checkin_live_full` | `{Game} — Packed house, sub lines full. Get out there and play!` |
