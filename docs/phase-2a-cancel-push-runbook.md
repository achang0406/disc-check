# Phase 2a — Game cancelled push runbook

Operations guide for verifying and troubleshooting the **game cancelled** push pipeline (Phase 2a).

**Source of truth:** [032_push_outbox.sql](../supabase/migrations/032_push_outbox.sql), [033_game_cancelled_push.sql](../supabase/migrations/033_game_cancelled_push.sql), [034_push_outbox_cron.sql](../supabase/migrations/034_push_outbox_cron.sql), [process-push-outbox](../supabase/functions/process-push-outbox/index.ts).

---

## 1. How it works

```mermaid
sequenceDiagram
  participant Admin
  participant DB as Postgres
  participant Outbox as push_outbox
  participant Cron as pg_cron
  participant Worker as process-push-outbox
  participant Phone as PWA_subscribers

  Admin->>DB: status open to cancelled
  DB->>Outbox: stub row game_cancelled
  Note over Admin,Outbox: Admin request finishes here

  Cron->>Worker: every 2 min
  Worker->>Outbox: set processed_at
  Worker->>Phone: Web Push if bell on
```

1. Admin sets a game `status` from `open` → `cancelled`.
2. Trigger `games_push_cancelled` inserts a **stub** row into `push_outbox` (no notification copy yet).
3. Every 2 minutes, `pg_cron` calls `process-push-outbox`.
4. The worker builds copy (`{Game} — Cancelled this week`), sends Web Push to subscribers with **game alerts on**, marks the row `processed_at`.

**Drained vs delivered:** `processed_at` set means the worker ran on that row. A push can still fail delivery (e.g. VAPID mismatch) while the row is marked processed.

---

## 2. Prerequisites

| Check | Where |
|-------|--------|
| Migrations `032`–`034` applied | Supabase → Database → Migrations |
| `pg_cron` + `pg_net` enabled | Database → Extensions |
| Vault secret `service_role_key` | Project Settings → Vault |
| Cron job `disc-check-process-push-outbox` | SQL query below |
| Edge functions deployed | `notify-push`, `process-push-outbox` |
| VAPID on edge functions | `VAPID_PUBLIC_KEY` = `VITE_VAPID_PUBLIC_KEY`, matching `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| Vercel rebuilt after VAPID change | Client bakes public key at build time |
| Tester: PWA installed, bell on | Game alerts toggle in group screen |
| Tester: app backgrounded | [src/sw.js](../src/sw.js) skips OS notification when app is foreground |

See [.env.example](../.env.example) for secret names.

---

## 3. E2E test — admin cancel → push

1. On a test device: install PWA, turn **game alerts on**, then background or close the app.
2. As admin: cancel an **open** game (`open` → `cancelled`).
3. Within ~2 minutes, run the SQL checks in section 4.
4. Expect notification body: `{Game name} — Cancelled this week`.
5. Tap notification → app opens the group and scrolls to that game (`?game=` deep link).

**Pass criteria:**

- [ ] Outbox row with `event_type = 'game_cancelled'`
- [ ] Row drained (`processed_at` not null)
- [ ] Push received on device (background only, bell on)
- [ ] RSVP/check-in latency unchanged (no new triggers on those paths in 2a)

---

## 4. SQL verification queries

Run in **Supabase → SQL Editor**.

### A. Outbox — latest rows / drain status

```sql
SELECT id, event_type, group_id, game_id, created_at, processed_at,
       processed_at IS NOT NULL AS drained
FROM push_outbox
ORDER BY created_at DESC
LIMIT 20;
```

### B. Outbox — pending backlog

```sql
SELECT
  COUNT(*) FILTER (WHERE processed_at IS NULL) AS pending,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS done
FROM push_outbox;
```

Run twice a few minutes apart: `pending` should drop (or stay 0) if drain is working.

### C. Cron — job installed

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'disc-check-process-push-outbox';
```

Expect one row: `schedule = */2 * * * *`.

### D. Cron — recent run history

```sql
SELECT status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'disc-check-process-push-outbox'
)
ORDER BY start_time DESC
LIMIT 10;
```

Look for `status = succeeded` every ~2 minutes.

### E. Vault — secret exists (name only)

```sql
SELECT name, created_at
FROM vault.secrets
WHERE name = 'service_role_key';
```

If missing, add the service role key in **Project Settings → Vault**, then re-run [034_push_outbox_cron.sql](../supabase/migrations/034_push_outbox_cron.sql).

### F. Subscribers — who would receive push

```sql
SELECT id, group_id, subscriber_id, notifications_enabled, updated_at
FROM push_subscriptions
WHERE notifications_enabled = true
ORDER BY updated_at DESC;
```

### G. Manual enqueue (optional)

```sql
SELECT enqueue_push_event('game_cancelled', '<group_id>', '<game_id>');
```

`enqueue_push_event` is restricted to `service_role`; SQL Editor runs as sufficient privilege.

---

## 5. Manual drain (bypass cron)

**Dashboard** → **Edge Functions** → `process-push-outbox` → **Invoke**  
Method: POST, body: `{}`

Or curl:

```bash
curl -s -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/process-push-outbox' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

**Expected response:**

```json
{ "processed": 1, "sent": 1, "skipped": 0, "pending": 1 }
```

`sent` may be `0` if no bell-on subscribers; `processed` should still increment if rows were drained.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No outbox row after cancel | Trigger missing or status wasn’t `open`→`cancelled` | Confirm migration `033`; check game status transition |
| `processed_at` stays NULL | Cron missing, Vault secret, or function 503 | Queries 4C–4E; add VAPID secrets on edge function |
| `processed_at` set, no notification | App in foreground, bell off, or delivery failed | Background app; query 4F; check edge function logs |
| `VapidPkHashMismatch` in logs | Client/server VAPID public key mismatch | Align `VITE_VAPID_PUBLIC_KEY` (Vercel) with `VAPID_PUBLIC_KEY` (Supabase); redeploy Vercel; toggle bell off/on |
| `Push is not configured` (503) | Missing VAPID on `process-push-outbox` | Add `VAPID_*` secrets to both push edge functions |
| Cron job missing | Migration `034` ran before Vault secret | Add `service_role_key`; re-run `034_push_outbox_cron.sql` |

Stale subscriptions signed with an old VAPID key are not auto-deleted on HTTP 400 (only 404/410). Re-subscribe by toggling game alerts off/on.

**Decision tree:**

```
processed_at still NULL?
├─ No cron.job row → Vault + re-run 034
├─ cron fails → fix service_role_key / pg_net
└─ manual invoke works → wait for cron or fix cron auth

processed_at set but no push?
├─ App foreground → expected (SW suppresses)
├─ bell off → enable game alerts
└─ VapidPkHashMismatch → align keys + re-subscribe
```

---

## 7. Rollback

To remove Phase 2a push infrastructure:

```bash
# Run in SQL Editor
scripts/supabase-rollback-032-push-outbox.sql
```

Unschedules cron, drops cancel trigger, removes `push_outbox` and `enqueue_push_event`.

---

## 8. Related docs

- [intent-aligned-push-refactor-v2-rollout.md](intent-aligned-push-refactor-v2-rollout.md) — full phased rollout plan
- [pwa-support.md](pwa-support.md) — PWA install, bell, service worker behavior
