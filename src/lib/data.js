import { getSupabase, isSupabaseConfigured } from "./supabase.js";

function formatGame(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    city: row.city,
    time: row.time,
    type: row.type,
    target: Number(row.target),
    status: row.status,
  };
}

function groupRsvps(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.game_id]) map[row.game_id] = [];
    map[row.game_id].push({
      userId: row.user_id,
      name: row.name,
      plusOnes: Number(row.plus_ones) || 0,
    });
  }
  return map;
}

export async function fetchAppData() {
  const supabase = getSupabase();

  const [gamesResult, rsvpsResult] = await Promise.all([
    supabase.from("games").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
    supabase
      .from("rsvps")
      .select("game_id, user_id, name, plus_ones")
      .order("created_at", { ascending: true }),
  ]);

  if (gamesResult.error) throw gamesResult.error;
  if (rsvpsResult.error) throw rsvpsResult.error;

  return {
    games: (gamesResult.data || []).map(formatGame),
    rsvps: groupRsvps(rsvpsResult.data || []),
  };
}

export async function upsertRsvp({ gameId, userId, name, plusOnes }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("rsvps").upsert(
    {
      game_id: gameId,
      user_id: userId,
      name,
      plus_ones: Number(plusOnes) || 0,
    },
    { onConflict: "game_id,user_id" },
  );

  if (error) throw error;
  return fetchAppData();
}

export async function cancelRsvp({ gameId, userId }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("rsvps").delete().eq("game_id", gameId).eq("user_id", userId);

  if (error) throw error;
  return fetchAppData();
}

export async function renameRsvps({ userId, name }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("rsvps").update({ name }).eq("user_id", userId);

  if (error) throw error;
  return fetchAppData();
}

export async function handleRsvpAction(body) {
  const action = body?.action;

  if (action === "rsvp") {
    if (!body.gameId || !body.userId || !body.name) {
      throw new Error("Missing RSVP fields");
    }
    return upsertRsvp({
      gameId: body.gameId,
      userId: body.userId,
      name: body.name,
      plusOnes: body.plusOnes,
    });
  }

  if (action === "cancel") {
    if (!body.gameId || !body.userId) {
      throw new Error("Missing cancel fields");
    }
    return cancelRsvp({ gameId: body.gameId, userId: body.userId });
  }

  if (action === "rename") {
    if (!body.userId || !body.name?.trim()) {
      throw new Error("Missing rename fields");
    }
    return renameRsvps({ userId: body.userId, name: body.name.trim() });
  }

  throw new Error("Unknown action");
}

export function subscribeToRsvps(onChange) {
  const supabase = getSupabase();

  const channel = supabase
    .channel("disc-check:rsvps")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rsvps" },
      () => {
        fetchAppData()
          .then((data) => onChange(data.rsvps))
          .catch(() => {
            // Keep last known data if a refresh fails temporarily.
          });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { isSupabaseConfigured };
