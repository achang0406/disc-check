import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import {
  getCurrentRsvpCycleStartUtc,
  normalizeCycleAt,
} from "../utils/gameSchedule.js";

function formatGame(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    address: row.address ?? null,
    startsAt: row.starts_at ?? null,
    type: row.type,
    target: Number(row.target),
    status: row.status,
    rsvpCycleAt: row.rsvp_cycle_at ?? null,
  };
}

async function ensureGameCycles(supabase, games) {
  const tasks = [];

  for (const game of games) {
    if (game.status === "cancelled") continue;
    if (!game.starts_at) continue;

    const currentCycle = getCurrentRsvpCycleStartUtc(game.starts_at);
    if (!currentCycle) continue;

    const storedCycle = normalizeCycleAt(game.rsvp_cycle_at);
    if (storedCycle === currentCycle) continue;

    tasks.push(
      supabase.rpc("reset_game_rsvp_cycle", {
        p_game_id: game.id,
        p_cycle: currentCycle,
      }),
    );
  }

  if (tasks.length === 0) return;

  const results = await Promise.all(tasks);
  const error = results.find((result) => result.error)?.error;
  if (error) throw error;
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

function toRpcGame(game) {
  return {
    id: game.id,
    name: game.name?.trim(),
    location: game.location?.trim(),
    address: game.address?.trim() || null,
    starts_at: game.startsAt,
    type: game.type || "goaltimate",
    target: Number(game.target) || 8,
    status: game.status || "open",
  };
}

function newGameId() {
  return `g_${crypto.randomUUID().slice(0, 8)}`;
}

export async function createGame(secret, payload) {
  const supabase = getSupabase();
  const game = { ...payload, id: newGameId() };
  const { error } = await supabase.rpc("admin_upsert_game", {
    p_secret: secret,
    p_game: toRpcGame(game),
  });
  if (error) throw error;
  return fetchAppData();
}

export async function updateGame(secret, id, payload) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_upsert_game", {
    p_secret: secret,
    p_game: toRpcGame({ ...payload, id }),
  });
  if (error) throw error;
  return fetchAppData();
}

export async function deleteGame(secret, id) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_delete_game", {
    p_secret: secret,
    p_game_id: id,
  });
  if (error) throw error;
  return fetchAppData();
}

export async function fetchAppData() {
  const supabase = getSupabase();

  const gamesResult = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (gamesResult.error) throw gamesResult.error;

  await ensureGameCycles(supabase, gamesResult.data || []);

  const rsvpsResult = await supabase
    .from("rsvps")
    .select("game_id, user_id, name, plus_ones")
    .order("created_at", { ascending: true });

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

export function subscribeToGames(onChange) {
  const supabase = getSupabase();

  const channel = supabase
    .channel("disc-check:games")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      () => {
        fetchAppData()
          .then((data) => onChange(data))
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
