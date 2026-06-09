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

async function readGameHeadcount(
  supabase: SupabaseClient,
  gameId: string,
  cycleAt: string | null,
): Promise<number> {
  if (!cycleAt) return 0;

  const { data: state } = await supabase
    .from("game_push_state")
    .select("rsvp_headcount")
    .eq("game_id", gameId)
    .eq("cycle_at", cycleAt)
    .maybeSingle();

  return state?.rsvp_headcount ?? 0;
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

  const title = gameName ?? groupName ?? "DiscCheck";
  const url = row.game_id
    ? gameDeepLink(row.group_id, row.game_id)
    : `/groups/${row.group_id}`;

  switch (row.event_type) {
    case "game_cancelled":
      return {
        title,
        body: `${gameName ?? "Game"} — Cancelled this week`,
        tag: `disc-check-cancel-${row.game_id}`,
        url,
      };
    case "badge_almost": {
      const snapshotHeadcount = row.payload?.headcount_at_enqueue;
      const snapshotTarget = row.payload?.target_at_enqueue;
      const headcount =
        typeof snapshotHeadcount === "number" && Number.isFinite(snapshotHeadcount)
          ? snapshotHeadcount
          : row.game_id
            ? await readGameHeadcount(supabase, row.game_id, gameCycleAt)
            : 0;
      const target =
        typeof snapshotTarget === "number" && Number.isFinite(snapshotTarget)
          ? snapshotTarget
          : gameTarget ?? 0;
      const need = Math.max(0, target - headcount);
      return {
        title,
        body: `${gameName ?? "Game"} — Almost there — need ${need} more`,
        tag: `disc-check-badge-${row.game_id}`,
        url,
      };
    }
    case "badge_go":
      return {
        title,
        body: `${gameName ?? "Game"} — Game on. See you there!`,
        tag: `disc-check-badge-${row.game_id}`,
        url,
      };
    case "phase_live":
      if (gameStatus === "cancelled") {
        return null;
      }
      return {
        title,
        body: `${gameName ?? "Game"} — Game is live — tap I'm here when you arrive`,
        tag: `disc-check-phase-${row.game_id}`,
        url,
      };
    default:
      console.warn("Unknown push event type — skipping", row.event_type, row.id);
      return null;
  }
}
