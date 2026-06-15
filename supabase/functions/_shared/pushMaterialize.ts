import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type PushPayload = {
  title: string;
  body: string;
  tag: string;
  url: string;
};

export type OutboxRow = {
  id: number;
  group_id: string;
  game_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
};

function isMaterializedPayload(payload: Record<string, unknown> | null): payload is PushPayload {
  return Boolean(
    payload &&
      typeof payload.title === "string" &&
      typeof payload.body === "string" &&
      typeof payload.tag === "string" &&
      typeof payload.url === "string",
  );
}

function gameDeepLink(groupId: string, gameId: string) {
  return `/groups/${groupId}?game=${gameId}`;
}

function readSnapshotNumber(payload: Record<string, unknown> | null, key: string) {
  const value = payload?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readPregameHeadcount(
  supabase: SupabaseClient,
  gameId: string,
  cycleAt: string | null,
): Promise<number> {
  if (!cycleAt) return 0;

  const { data: state } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount, pregame_guest_count")
    .eq("game_id", gameId)
    .eq("cycle_at", cycleAt)
    .maybeSingle();

  return (state?.rsvp_headcount ?? 0) + (state?.pregame_guest_count ?? 0);
}

async function readCheckinHeadcount(
  supabase: SupabaseClient,
  gameId: string,
  cycleAt: string | null,
): Promise<number> {
  if (!cycleAt) return 0;

  const { data: state } = await supabase
    .from("game_push_state")
    .select("checkin_headcount")
    .eq("game_id", gameId)
    .eq("cycle_at", cycleAt)
    .maybeSingle();

  return state?.checkin_headcount ?? 0;
}

export async function materializePushPayload(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<PushPayload | null> {
  if (isMaterializedPayload(row.payload)) {
    return row.payload;
  }

  let gameName: string | null = null;
  let groupName: string | null = null;
  let gameTarget: number | null = null;
  let gameCycleAt: string | null = null;
  let gameStatus: string | null = null;

  if (row.game_id) {
    const { data: game } = await supabase
      .from("games")
      .select("name, target, rsvp_cycle_at, status")
      .eq("id", row.game_id)
      .maybeSingle();
    gameName = game?.name ?? null;
    gameTarget = game?.target ?? null;
    gameCycleAt = game?.rsvp_cycle_at ?? null;
    gameStatus = game?.status ?? null;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", row.group_id)
    .maybeSingle();
  groupName = group?.name ?? null;

  const title = gameName ?? groupName ?? "PickupFrisbee";
  const url = row.game_id
    ? gameDeepLink(row.group_id, row.game_id)
    : `/groups/${row.group_id}`;
  const gameLabel = gameName ?? "Game";

  switch (row.event_type) {
    case "game_cancelled":
      return {
        title,
        body: `${gameLabel} — Cancelled this week`,
        tag: `disc-check-cancel-${row.game_id}`,
        url,
      };
    case "rsvp_almost":
    case "badge_almost": {
      const snapshotHeadcount = readSnapshotNumber(row.payload, "headcount_at_enqueue");
      const snapshotTarget = readSnapshotNumber(row.payload, "target_at_enqueue");
      const headcount =
        snapshotHeadcount ??
        (row.game_id ? await readPregameHeadcount(supabase, row.game_id, gameCycleAt) : 0);
      const target = snapshotTarget ?? gameTarget ?? 0;
      const need = Math.max(0, target - headcount);
      return {
        title,
        body: `${gameLabel} — Almost a go! ${need} more and we're on.`,
        tag: `disc-check-rsvp-${row.game_id}`,
        url,
      };
    }
    case "rsvp_go":
    case "badge_go":
      return {
        title,
        body: `${gameLabel} — We're on! See you there.`,
        tag: `disc-check-rsvp-${row.game_id}`,
        url,
      };
    case "rsvp_surge_some":
      return {
        title,
        body: `${gameLabel} — RSVP surge — subs are stacking up!`,
        tag: `disc-check-rsvp-${row.game_id}`,
        url,
      };
    case "rsvp_surge_full":
      return {
        title,
        body: `${gameLabel} — Huge turnout brewing! Sub lines filling fast.`,
        tag: `disc-check-rsvp-${row.game_id}`,
        url,
      };
    case "phase_live":
      if (gameStatus === "cancelled") {
        return null;
      }
      return {
        title,
        body: `${gameLabel} — We're live! Tap I'm here when you land.`,
        tag: `disc-check-phase-${row.game_id}`,
        url,
      };
    case "checkin_almost": {
      const snapshotHeadcount = readSnapshotNumber(row.payload, "headcount_at_enqueue");
      const snapshotTarget = readSnapshotNumber(row.payload, "target_at_enqueue");
      const headcount =
        snapshotHeadcount ??
        (row.game_id ? await readCheckinHeadcount(supabase, row.game_id, gameCycleAt) : 0);
      const target = snapshotTarget ?? gameTarget ?? 0;
      const need = Math.max(0, target - headcount);
      return {
        title,
        body: `${gameLabel} — Almost there — ${need} more here and we're on!`,
        tag: `disc-check-checkin-${row.game_id}`,
        url,
      };
    }
    case "checkin_go":
      return {
        title,
        body: `${gameLabel} — We're on! Game's happening now.`,
        tag: `disc-check-checkin-${row.game_id}`,
        url,
      };
    case "checkin_live_some":
    case "badge_live_some":
      return {
        title,
        body: `${gameLabel} — Crowd's building — subs are stacking!`,
        tag: `disc-check-checkin-${row.game_id}`,
        url,
      };
    case "checkin_live_full":
    case "badge_live_full":
      return {
        title,
        body: `${gameLabel} — Packed house, sub lines full. Get out there and play!`,
        tag: `disc-check-checkin-${row.game_id}`,
        url,
      };
    case "chat_chatter":
      return {
        title: groupName ?? "PickupFrisbee",
        body: "There's some chatter — come say hi",
        tag: `disc-check-chatter-${row.group_id}`,
        url: `/groups/${row.group_id}`,
      };
    default:
      console.warn("Unknown push event type — skipping", row.event_type, row.id);
      return null;
  }
}
