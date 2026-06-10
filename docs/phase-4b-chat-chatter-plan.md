---
name: Phase 4b chat chatter enqueue
overview: "Enqueue chat_chatter summary push when 2+ active senders in 30m and 1h cooldown; drain stale check, pending supersede, materialize on edge."
status: planned
migration: "043"
prerequisites: [4a, chatterPush.ts drain stale guard]
---

# Phase 4b — Chatter enqueue + delivery

Reference: [phase-4a-chat-push-state-plan.md](phase-4a-chat-push-state-plan.md), [intent-aligned-push-refactor-v2-rollout.md](intent-aligned-push-refactor-v2-rollout.md).

**Prerequisite (shipped before 043):** [`chatterPush.ts`](../supabase/functions/_shared/chatterPush.ts) drain stale guard + `process-push-outbox` wiring.

## When is chatter "active" vs "died down"?

Two moments matter:

| Moment | Rule | Why |
| ------ | ---- | --- |
| **Enqueue** (on INSERT) | `distinct_sender_count >= 2` after in-trigger prune | O(1) on hot path; same 30m window |
| **Drain** (~2 min later) | **Re-count** senders in `window_senders` with `at >= now() - 30m` | `distinct_sender_count` only updates on new messages — if chat goes quiet, the column can stay `2` until someone sends again |

**Died down at drain** = fewer than 2 distinct `sender_id` values with `at` inside the rolling 30-minute window (time-based prune applied in TS, not trusting the cached count alone).

Example: A and B chat → row enqueued. No further messages for 35 minutes → drain recomputes 0 active senders → **skip** (stale).

Counter-example: A and B chat 1 minute ago → drain still sees 2 active → **deliver**.

## Migration `043` — extend `maintain_chat_push_state`

After existing steps 1–7 (4a window maintain), add step 8:

```sql
-- Read last_push_at from locked row (add to SELECT … FOR UPDATE)
IF v_distinct >= 2
   AND (v_last_push_at IS NULL OR v_last_push_at <= v_now - INTERVAL '1 hour')
THEN
  DELETE FROM push_outbox
  WHERE group_id = p_group_id
    AND event_type = 'chat_chatter'
    AND processed_at IS NULL;

  PERFORM enqueue_push_event(
    'chat_chatter',
    p_group_id,
    NULL,
    ARRAY[p_sender_id],
    NULL
  );

  v_last_push_at := v_now;
END IF;

-- Final UPDATE includes last_push_at when enqueued
```

Guards:

1. **Cooldown** — `last_push_at` set atomically in same transaction as enqueue (≤1 enqueue/hour/group).
2. **Pending supersede** — at most one unprocessed `chat_chatter` row per group.
3. **Exclude** — `ARRAY[p_sender_id]` (matches push `subscriber_id`).

## Edge — `pushMaterialize.ts`

```typescript
case "chat_chatter":
  return {
    title: groupName ?? "DiscCheck",
    body: "There's some chatter — come say hi",
    tag: `disc-check-chatter-${row.group_id}`,
    url: `/groups/${row.group_id}`,
  };
```

Use group name for title (not game). Redeploy `process-push-outbox`.

## Drain — stale skip (pre-shipped)

[`isStaleChatterOutboxRow`](../supabase/functions/_shared/chatterPush.ts): skip + mark processed when active window senders `< 2`.

## Verify (`npm run verify:4b-chat-chatter`)

1. Two senders → one pending `chat_chatter` row; `last_push_at` set
2. Third message within 1h → no second row
3. Single sender only → no row
4. Drain with active window → materialize + skip if no subscriptions (`sent: 0` ok)
5. **Died down:** insert outbox row manually + `window_senders` with both `at` > 31m ago → drain skips (`verify:4b-chatter-stale-drain`)

## Rollback `043`

Replace `maintain_chat_push_state` with 4a-only body (no DELETE/enqueue/`last_push_at` write). Keep table + 4a trigger. Edge can keep stale guard (harmless).

## Deploy checklist

- [ ] `supabase db push` (043)
- [ ] Sync `schema.sql`
- [ ] Deploy `process-push-outbox` (stale + materialize)
- [ ] `npm run verify:4b-chat-chatter`
- [ ] `npm run verify:4b-chatter-stale-drain`
- [ ] Latency gate: chat send still instant
- [ ] Manual: 2 devices, bell on, background → one summary not per message
