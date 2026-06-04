import { getSupabase, isSupabaseConfigured } from "./supabase.js";
import { normalizePhone } from "../utils/phone.js";
import {
  getDisplayCycleStartUtc,
  isGameCycleStale,
  normalizeCycleAt,
  parseStartTime,
} from "../utils/gameSchedule.js";

function formatGroup(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
  };
}

function formatGame(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    location: row.location,
    address: row.address ?? null,
    weekday: row.weekday ?? null,
    startTime: row.start_time ?? null,
    timezone: row.timezone ?? null,
    type: row.type,
    target: Number(row.target),
    status: row.status,
    rsvpCycleAt: row.rsvp_cycle_at ?? null,
  };
}

function getGameDisplayCycle(game) {
  return normalizeCycleAt(getDisplayCycleStartUtc(game));
}

function groupRsvps(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.game_id]) map[row.game_id] = [];
    map[row.game_id].push({
      userId: row.user_id,
      name: row.name,
      plusOnes: Number(row.plus_ones) || 0,
      bringingKit: row.bringing_kit === true,
    });
  }
  return map;
}

function groupCheckIns(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.game_id]) map[row.game_id] = [];
    map[row.game_id].push({
      userId: row.user_id,
      name: row.name,
      plusOnes: Number(row.plus_ones) || 0,
      bringingKit: row.bringing_kit === true,
    });
  }
  return map;
}

function groupGuests(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.game_id]) map[row.game_id] = [];
    map[row.game_id].push({
      id: String(row.id),
      name: row.name,
    });
  }
  return map;
}

function formatStartTimeForRpc(value) {
  const clock = parseStartTime(value);
  if (!clock) return null;

  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}:00`;
}

function toRpcGame(game) {
  const startTime = game.startTime ?? game.start_time;

  return {
    id: game.id,
    group_id: game.groupId ?? game.group_id,
    name: game.name?.trim(),
    location: game.location?.trim(),
    address: game.address?.trim() || null,
    weekday: game.weekday == null ? null : Number(game.weekday),
    start_time: formatStartTimeForRpc(startTime),
    timezone: game.timezone,
    type: game.type || "goaltimate",
    target: Number(game.target) || 8,
    status: game.status || "open",
  };
}

function newGameId() {
  return `g_${crypto.randomUUID().slice(0, 8)}`;
}

function formatProfileFromRpc(data) {
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone ?? null,
    bubbleColor: data.bubbleColor ?? null,
  };
}

export async function findProfileByPhone(phone) {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("find_profile_by_phone", { p_phone: phone });
  if (error) throw error;

  return formatProfileFromRpc(data);
}

export async function fetchProfileById(id) {
  if (!isSupabaseConfigured() || !id) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, phone, bubble_color")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone ?? null,
    bubbleColor: data.bubble_color ?? null,
  };
}

export async function upsertProfile(profile) {
  if (!isSupabaseConfigured()) {
    return {
      id: profile.id,
      name: profile.name,
      phone: profile.phone ?? null,
      bubbleColor: profile.bubbleColor ?? null,
    };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("upsert_profile", {
    p_profile: {
      id: profile.id,
      name: profile.name,
      phone: profile.phone ?? null,
      bubbleColor: profile.bubbleColor ?? null,
    },
  });
  if (error) throw error;

  return formatProfileFromRpc(data);
}

export async function deleteProfile(id) {
  if (!isSupabaseConfigured() || !id) return;

  const supabase = getSupabase();
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

/** Persist profile to Supabase only when a phone is linked; remove row when phone is cleared. */
export async function syncProfileToServer(profile, { previousPhone } = {}) {
  const phone = profile.phone ?? null;

  if (!isSupabaseConfigured()) {
    return {
      id: profile.id,
      name: profile.name,
      phone,
      bubbleColor: profile.bubbleColor ?? null,
    };
  }

  if (phone) {
    return upsertProfile({ ...profile, phone });
  }

  const hadPhone = normalizePhone(previousPhone);
  if (hadPhone && profile.id) {
    await deleteProfile(profile.id);
  }

  return {
    id: profile.id,
    name: profile.name,
    phone: null,
    bubbleColor: profile.bubbleColor ?? null,
  };
}

export async function updateGroup(secret, group) {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("admin_upsert_group", {
    p_secret: secret,
    p_group: {
      id: group.id,
      name: group.name?.trim(),
      description: group.description?.trim() || null,
      admin_passcode: group.adminPasscode?.trim() || null,
    },
  });
  if (error) throw error;
  return fetchAppData();
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

let appDataFetchSeq = 0;

export async function fetchAppData() {
  const fetchSeq = ++appDataFetchSeq;
  const supabase = getSupabase();

  const groupsResult = await supabase
    .from("groups")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (groupsResult.error) throw groupsResult.error;

  const gamesResult = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (gamesResult.error) throw gamesResult.error;

  const rsvpsResult = await supabase
    .from("rsvps")
    .select("game_id, user_id, name, plus_ones, bringing_kit")
    .order("created_at", { ascending: true });

  if (rsvpsResult.error) throw rsvpsResult.error;

  const checkInsResult = await supabase
    .from("game_check_ins")
    .select("game_id, user_id, name, plus_ones, bringing_kit, cycle_at")
    .order("created_at", { ascending: true });

  if (checkInsResult.error) throw checkInsResult.error;

  const guestsResult = await supabase
    .from("game_guests")
    .select("id, game_id, name, cycle_at")
    .order("created_at", { ascending: true });

  if (guestsResult.error) throw guestsResult.error;

  const games = (gamesResult.data || []).map(formatGame);
  const displayCycles = Object.fromEntries(
    games.map((game) => [game.id, getGameDisplayCycle(game)]),
  );

  const activeRsvpRows = (rsvpsResult.data || []).filter((row) => {
    const game = games.find((entry) => entry.id === row.game_id);
    if (!game || isGameCycleStale(game)) return false;
    return true;
  });

  const activeCheckIns = (checkInsResult.data || []).filter((row) => {
    const expected = displayCycles[row.game_id];
    return expected && normalizeCycleAt(row.cycle_at) === expected;
  });

  const activeGuests = (guestsResult.data || []).filter((row) => {
    const expected = displayCycles[row.game_id];
    return expected && normalizeCycleAt(row.cycle_at) === expected;
  });

  return {
    groups: (groupsResult.data || []).map(formatGroup),
    games,
    rsvps: groupRsvps(activeRsvpRows),
    checkIns: groupCheckIns(activeCheckIns),
    guests: groupGuests(activeGuests),
    fetchSeq,
  };
}

export function gamesForGroup(games, groupId) {
  return games.filter((game) => game.groupId === groupId);
}

export async function upsertRsvp({ gameId, userId, name, plusOnes, bringingKit = false }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("rsvps").upsert(
    {
      game_id: gameId,
      user_id: userId,
      name,
      plus_ones: Number(plusOnes) || 0,
      bringing_kit: Boolean(bringingKit),
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

  const checkInRename = await supabase.from("game_check_ins").update({ name }).eq("user_id", userId);
  if (checkInRename.error) throw checkInRename.error;

  return fetchAppData();
}

export async function upsertCheckIn({
  gameId,
  userId,
  name,
  plusOnes,
  cycleAt,
  bringingKit = false,
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from("game_check_ins").upsert(
    {
      game_id: gameId,
      user_id: userId,
      name,
      plus_ones: Number(plusOnes) || 0,
      bringing_kit: Boolean(bringingKit),
      cycle_at: cycleAt,
    },
    { onConflict: "game_id,user_id,cycle_at" },
  );

  if (error) throw error;
  return fetchAppData();
}

export async function cancelCheckIn({ gameId, userId, cycleAt }) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("game_check_ins")
    .delete()
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .eq("cycle_at", cycleAt);

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
      bringingKit: body.bringingKit,
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

export async function handleCheckInAction(body) {
  const action = body?.action;

  if (action === "check_in") {
    if (!body.gameId || !body.userId || !body.name || !body.cycleAt) {
      throw new Error("Missing check-in fields");
    }
    return upsertCheckIn({
      gameId: body.gameId,
      userId: body.userId,
      name: body.name,
      plusOnes: body.plusOnes,
      cycleAt: body.cycleAt,
      bringingKit: body.bringingKit,
    });
  }

  if (action === "check_out") {
    if (!body.gameId || !body.userId || !body.cycleAt) {
      throw new Error("Missing check-out fields");
    }
    return cancelCheckIn({
      gameId: body.gameId,
      userId: body.userId,
      cycleAt: body.cycleAt,
    });
  }

  throw new Error("Unknown check-in action");
}

export async function addWalkInGuest({ gameId, name, cycleAt }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("game_guests").insert({
    game_id: gameId,
    name: name.trim(),
    cycle_at: cycleAt,
  });

  if (error) throw error;
  return fetchAppData();
}

export async function removeWalkInGuest({ guestId }) {
  const supabase = getSupabase();
  const { error } = await supabase.from("game_guests").delete().eq("id", guestId);

  if (error) throw error;
  return fetchAppData();
}

export async function handleGuestAction(body) {
  const action = body?.action;

  if (action === "add") {
    if (!body.gameId || !body.name?.trim() || !body.cycleAt) {
      throw new Error("Missing guest fields");
    }
    return addWalkInGuest({
      gameId: body.gameId,
      name: body.name.trim(),
      cycleAt: body.cycleAt,
    });
  }

  if (action === "remove") {
    if (!body.guestId) {
      throw new Error("Missing guest id");
    }
    return removeWalkInGuest({ guestId: body.guestId });
  }

  throw new Error("Unknown guest action");
}

function createDebouncedAppDataRefresh(onChange, delayMs = 250) {
  let timer = null;

  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fetchAppData()
        .then((data) => onChange(data))
        .catch(() => {
          // Keep last known data if a refresh fails temporarily.
        });
    }, delayMs);
  };
}

export function subscribeToGroups(onChange) {
  const supabase = getSupabase();
  const refresh = createDebouncedAppDataRefresh(onChange);

  const channel = supabase
    .channel("disc-check:groups")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "groups" },
      refresh,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToGames(onChange) {
  const supabase = getSupabase();
  const refresh = createDebouncedAppDataRefresh(onChange);

  const channel = supabase
    .channel("disc-check:games")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      refresh,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToRsvps(onChange) {
  const supabase = getSupabase();
  const refresh = createDebouncedAppDataRefresh(onChange);

  const channel = supabase
    .channel("disc-check:rsvps")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rsvps" },
      refresh,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCheckIns(onChange) {
  const supabase = getSupabase();
  const refresh = createDebouncedAppDataRefresh(onChange);

  const channel = supabase
    .channel("disc-check:check-ins")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_check_ins" },
      refresh,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToGuests(onChange) {
  const supabase = getSupabase();
  const refresh = createDebouncedAppDataRefresh(onChange);

  const channel = supabase
    .channel("disc-check:guests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_guests" },
      refresh,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export { isSupabaseConfigured };
