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

export async function materializePushPayload(
  supabase: SupabaseClient,
  row: OutboxRow,
): Promise<PushPayload | null> {
  if (isMaterializedPayload(row.payload)) {
    return row.payload;
  }

  let gameName: string | null = null;
  let groupName: string | null = null;

  if (row.game_id) {
    const { data: game } = await supabase
      .from("games")
      .select("name")
      .eq("id", row.game_id)
      .maybeSingle();
    gameName = game?.name ?? null;
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
    default:
      console.warn("Unknown push event type — skipping", row.event_type, row.id);
      return null;
  }
}
