import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { isLiveWindow } from "./badgePush.ts";
import type { OutboxRow } from "./pushMaterialize.ts";

export function isStaleCancelledRowForStatus(status: string | null | undefined) {
  return status !== "cancelled";
}

export function isStalePhaseLiveRowForState(
  status: string | null | undefined,
  cycleAt: Date | null,
  lastPhase: string | null | undefined,
  now = new Date(),
) {
  if (status !== "open" || !cycleAt) {
    return true;
  }

  if (lastPhase !== "live") {
    return true;
  }

  return !isLiveWindow(cycleAt, now);
}

export async function isStaleCancelledOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (row.event_type !== "game_cancelled" || !row.game_id) {
    return false;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("status")
    .eq("id", row.game_id)
    .maybeSingle();

  if (gameError) {
    console.error("game_cancelled stale check failed — games", row.id, gameError.message);
    return true;
  }

  return isStaleCancelledRowForStatus(game?.status);
}

export async function isStalePhaseLiveOutboxRow(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<boolean> {
  if (row.event_type !== "phase_live" || !row.game_id) {
    return false;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("rsvp_cycle_at, status")
    .eq("id", row.game_id)
    .maybeSingle();

  if (gameError) {
    console.error("phase_live stale check failed — games", row.id, gameError.message);
    return true;
  }

  if (!game?.rsvp_cycle_at) {
    return true;
  }

  const { data: state, error: stateError } = await supabase
    .from("game_push_state")
    .select("last_phase")
    .eq("game_id", row.game_id)
    .eq("cycle_at", game.rsvp_cycle_at)
    .maybeSingle();

  if (stateError) {
    console.error("phase_live stale check failed — game_push_state", row.id, stateError.message);
    return true;
  }

  return isStalePhaseLiveRowForState(
    game.status,
    new Date(game.rsvp_cycle_at),
    state?.last_phase,
  );
}
