-- Rollback Phase 4a: chat_push_state + maintain trigger.

DROP TRIGGER IF EXISTS group_chat_messages_maintain_push_state ON group_chat_messages;

DROP FUNCTION IF EXISTS trg_group_chat_maintain_push_state();
DROP FUNCTION IF EXISTS maintain_chat_push_state(TEXT, TEXT);

DROP TABLE IF EXISTS chat_push_state CASCADE;
