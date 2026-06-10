---
name: Phase 4a chat push state
overview: "Incremental chat_push_state on message insert — sender-deduped 30m window, no outbox, no OS push. Prerequisite for 4b chatter enqueue."
status: implemented
migration: "042"
---

# Phase 4a — Chat push state (no notifications)

Reference: [intent-aligned-push-refactor-v2-rollout.md](intent-aligned-push-refactor-v2-rollout.md) Phase 4 design review.

**Ship:** `chat_push_state` + `maintain_chat_push_state` steps 1–5 on `group_chat_messages` INSERT. **No** `push_outbox`, **no** `last_push_at` writes.

## Why split 4a / 4b

Same pattern as 2b-ii → 2b-iii: validate chat send latency and window integrity before adding enqueue + drain.

## Schema (`042_chat_push_state.sql`)

```sql
chat_push_state (
  group_id TEXT PRIMARY KEY REFERENCES groups(id) ON DELETE CASCADE,
  window_senders JSONB NOT NULL DEFAULT '[]',  -- [{sender_id, at}, ...] one entry per sender
  distinct_sender_count INTEGER NOT NULL DEFAULT 0,
  last_push_at TIMESTAMPTZ,                    -- reserved for 4b; never written in 4a
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

Constants (in function body):

| Constant | Value |
| -------- | ----- |
| Window | 30 minutes |
| Max distinct senders in array | 20 |

## `maintain_chat_push_state(p_group_id, p_sender_id)`

1. Guard null/empty `group_id` / `sender_id`
2. `INSERT … ON CONFLICT (group_id) DO NOTHING` then `SELECT … FOR UPDATE`
3. Prune `window_senders`: drop entries where `at < now() - 30 min`
4. Dedupe by `sender_id`: if present → update `at`; else append `{sender_id, at}`
5. If distinct senders > 20 → drop entries with oldest `at` until ≤ 20
6. Set `distinct_sender_count` = `jsonb_array_length(window_senders)` (recomputed)
7. Set `updated_at = now()`
8. **Stop** — no outbox, no `last_push_at` (4b adds step 9)

Trigger:

```sql
CREATE TRIGGER group_chat_messages_maintain_push_state
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION trg_group_chat_maintain_push_state();
```

Wrapper calls `maintain_chat_push_state(NEW.group_id, NEW.sender_id)` and returns `NEW`.

**Not** on UPDATE/DELETE. Separate from `trim_group_chat_messages_after_insert`.

## Integrity rules

- **Never** cap raw message events — only cap **distinct senders**
- Repeat messages from same sender refresh `at` only; count unchanged
- Prune by time, not by message volume

## 4b hook (do not ship in 4a)

After step 6, when `distinct_sender_count >= 2` and (`last_push_at` IS NULL OR `last_push_at < now() - 1 hour`):

- `enqueue_push_event('chat_chatter', group_id, NULL, ARRAY[sender_id], NULL)`
- `last_push_at = now()`

Copy on drain ([`pushMaterialize.ts`](../supabase/functions/_shared/pushMaterialize.ts)):

| Field | Value |
| ----- | ----- |
| Title | `{group name}` |
| Body | `There's some chatter — come say hi` |
| Tag | `disc-check-chatter-{groupId}` |
| URL | `/groups/{groupId}` |

## Verify (`npm run verify:4a-chat-push-state`)

Script spec (implement with 4a):

1. Pick `VERIFY_GROUP_ID` (default: group of `VERIFY_GAME_ID` / `g_1baf4461`)
2. Clear `chat_push_state` row for test group (restore after)
3. **Mono sender:** insert 3 messages, same `sender_id` → `distinct_sender_count = 1`
4. **Two senders:** second `sender_id` within window → `distinct_sender_count = 2`
5. **No push:** assert no new unprocessed `chat_chatter` / any outbox rows from test
6. **Latency smoke:** time one insert; assert < 500ms local RTT budget (informational log)
7. Optional **prune:** backdate one `window_senders[].at` > 31m ago via service role, re-insert → count drops

## Rollback

`scripts/supabase-rollback-042-chat-push-state.sql` (create with 4a): drop trigger + functions; drop table.

## Deploy checklist

- [ ] `supabase db push` (042)
- [ ] Sync [`supabase/schema.sql`](../supabase/schema.sql)
- [ ] `npm run verify:4a-chat-push-state`
- [ ] Manual: send chat in app — instant, no OS notification
- [ ] **Do not** deploy edge changes (4a is DB-only)

## E2E (staging)

- [ ] Send message feels instant vs baseline
- [ ] No OS push of any kind
- [ ] One sender × many messages → `distinct_sender_count = 1`
- [ ] Two senders within 30 min → `distinct_sender_count = 2`
- [ ] After 31 min idle + new message, prune drops stale senders
