-- Phase 3a: enqueue phase_live for games due at next_live_at (called from drain tick).

CREATE OR REPLACE FUNCTION enqueue_due_phase_live_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_next_live TIMESTAMPTZ;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT
      gps.game_id,
      gps.cycle_at,
      gps.group_id,
      g.weekday,
      g.start_time,
      g.timezone
    FROM game_push_state gps
    INNER JOIN games g ON g.id = gps.game_id
    WHERE gps.next_live_at IS NOT NULL
      AND gps.next_live_at <= NOW()
      AND gps.game_status <> 'cancelled'
      AND g.status = 'open'
      AND g.rsvp_cycle_at = gps.cycle_at
      AND gps.last_phase IS DISTINCT FROM 'live'
    FOR UPDATE OF gps SKIP LOCKED
  LOOP
    PERFORM enqueue_push_event('phase_live', v_row.group_id, v_row.game_id, '{}', NULL);

    v_next_live := get_current_occurrence_start(
      v_row.weekday,
      v_row.start_time,
      v_row.timezone,
      v_row.cycle_at + INTERVAL '7 days'
    );

    UPDATE game_push_state
    SET
      last_phase = 'live',
      next_live_at = v_next_live,
      updated_at = NOW()
    WHERE game_id = v_row.game_id
      AND cycle_at = v_row.cycle_at;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION enqueue_due_phase_live_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_due_phase_live_events() TO service_role;
