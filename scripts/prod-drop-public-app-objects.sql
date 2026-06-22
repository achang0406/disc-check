-- Wave 1h: drop legacy disc-check app objects from prod hub public schema only.
-- Prerequisite: Production reads pickup_frisbee (Wave 1f/1g complete).
-- Never DROP SCHEMA public.

BEGIN;

-- Remove legacy Realtime publication entries (pickup_frisbee entries remain).
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'rsvps',
    'games',
    'groups',
    'group_chat_messages',
    'group_chat_message_reactions',
    'game_check_ins',
    'game_guests'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    END IF;
  END LOOP;
END;
$$;

-- Drop app tables (CASCADE removes triggers, policies, FKs).
DROP TABLE IF EXISTS public.group_chat_message_reactions CASCADE;
DROP TABLE IF EXISTS public.group_chat_messages CASCADE;
DROP TABLE IF EXISTS public.game_check_ins CASCADE;
DROP TABLE IF EXISTS public.game_guests CASCADE;
DROP TABLE IF EXISTS public.rsvps CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.push_outbox CASCADE;
DROP TABLE IF EXISTS public.game_push_state CASCADE;
DROP TABLE IF EXISTS public.chat_push_state CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.app_config CASCADE;

-- Drop remaining app functions (orphans after table drops).
DROP FUNCTION IF EXISTS public.admin_delete_game(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_upsert_game(TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.admin_upsert_group(TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.badge_milestone_rank(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.checkin_milestone_to_event(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.compute_badge_milestone(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.compute_pregame_badge_milestone(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_check_in_delete() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_check_in_window() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_guest_window() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_rsvp_window() CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_due_phase_live_events() CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_push_event(TEXT, TEXT, TEXT, TEXT[], JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.find_profile_by_phone(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_occurrence_start(SMALLINT, TIME, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.get_current_occurrence_start(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.is_cycle_reset_in_progress() CASCADE;
DROP FUNCTION IF EXISTS public.is_game_live(SMALLINT, TIME, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.is_game_live(TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.is_rsvp_locked(SMALLINT, TIME, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.maintain_chat_push_state(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.maintain_checkin_push_headcount() CASCADE;
DROP FUNCTION IF EXISTS public.maintain_pregame_guest_push_headcount() CASCADE;
DROP FUNCTION IF EXISTS public.maintain_rsvp_push_headcount() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_phone(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.prune_activity_retention() CASCADE;
DROP FUNCTION IF EXISTS public.prune_game_push_state(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.prune_push_outbox(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.reset_game_rsvp_cycle(TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.reset_stale_game_cycles() CASCADE;
DROP FUNCTION IF EXISTS public.rsvp_milestone_to_event(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.supersede_pending_badge(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.supersede_pending_checkin_badge(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.supersede_pending_rsvp_badge(TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.sync_game_push_state_denorm() CASCADE;
DROP FUNCTION IF EXISTS public.trg_games_push_cancelled() CASCADE;
DROP FUNCTION IF EXISTS public.trg_group_chat_maintain_push_state() CASCADE;
DROP FUNCTION IF EXISTS public.trg_group_chat_reaction_set_group_id() CASCADE;
DROP FUNCTION IF EXISTS public.trim_game_chat_messages() CASCADE;
DROP FUNCTION IF EXISTS public.trim_group_chat_messages() CASCADE;
DROP FUNCTION IF EXISTS public.try_enqueue_checkin_badge_upgrade(TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.try_enqueue_rsvp_badge_upgrade(TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_game_push_state_for_cycle(TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_profile(JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.verify_group_admin(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.verify_group_admin_secret(TEXT, TEXT) CASCADE;

COMMIT;
