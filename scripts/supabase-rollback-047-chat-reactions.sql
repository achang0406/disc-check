-- Rollback 047: group chat message reactions.

DROP TRIGGER IF EXISTS group_chat_message_reactions_set_group_id ON group_chat_message_reactions;

DROP FUNCTION IF EXISTS trg_group_chat_reaction_set_group_id();

DROP TABLE IF EXISTS group_chat_message_reactions CASCADE;
