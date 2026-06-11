import { countHeadcount, countPregameHeadcount } from "../utils/format.js";
import { isGameLive, normalizeCycleAt } from "../utils/gameSchedule.js";
import {
  checkinBadgeEventRank,
  computeBadgeMilestone,
  isCheckinBadgeEventType,
  isRsvpBadgeEventType,
  rsvpBadgeEventRank,
} from "../utils/badgeMilestone.js";

export const OBSERVED_ALERTS_STORAGE_KEY = "disc-check-observed-alerts-v1";

const SW_SYNC_DEBOUNCE_MS = 300;
const EXPIRED_CYCLE_MS = 8 * 7 * 24 * 60 * 60 * 1000;

let swSyncTimer = null;

export function emptyObservedAlerts() {
  return { games: {}, groups: {} };
}

export function loadObservedAlerts() {
  if (typeof localStorage === "undefined") {
    return emptyObservedAlerts();
  }

  try {
    const raw = localStorage.getItem(OBSERVED_ALERTS_STORAGE_KEY);
    if (!raw) return emptyObservedAlerts();
    const parsed = JSON.parse(raw);
    return {
      games: parsed?.games && typeof parsed.games === "object" ? parsed.games : {},
      groups: parsed?.groups && typeof parsed.groups === "object" ? parsed.groups : {},
    };
  } catch {
    return emptyObservedAlerts();
  }
}

export function saveObservedAlerts(observed) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(OBSERVED_ALERTS_STORAGE_KEY, JSON.stringify(observed));
}

function cycleAtMs(cycleAt) {
  const normalized = normalizeCycleAt(cycleAt);
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

export function pruneObservedGames(observed, { knownGameIds, now = new Date() }) {
  const known = knownGameIds instanceof Set ? knownGameIds : new Set(knownGameIds ?? []);
  const nowMs = now.getTime();
  let changed = false;

  for (const gameId of Object.keys(observed.games)) {
    const entry = observed.games[gameId];
    const storedMs = cycleAtMs(entry?.cycleAt);
    const expired = storedMs != null && nowMs - storedMs > EXPIRED_CYCLE_MS;
    const orphan = !known.has(gameId);

    if (orphan || expired) {
      delete observed.games[gameId];
      changed = true;
    }
  }

  return changed;
}

function ensureGameEntry(observed, gameId, cycleAt) {
  const normalizedCycle = normalizeCycleAt(cycleAt);
  const existing = observed.games[gameId];

  if (!existing || normalizeCycleAt(existing.cycleAt) !== normalizedCycle) {
    observed.games[gameId] = {
      cycleAt: normalizedCycle,
      rsvpRank: 0,
      checkinRank: 0,
      phaseLive: false,
      cancelled: false,
    };
    return true;
  }

  return false;
}

/**
 * Record badge milestone observations for visible group games.
 * Returns true if any rank increased, entries were reset, or prune removed rows.
 */
export function recordGameBadgeObservations(
  observed,
  { games, allGames, rsvps, checkIns, guests, now = new Date() },
) {
  const knownGameIds = new Set((allGames ?? games).map((game) => game.id));
  let changed = pruneObservedGames(observed, { knownGameIds, now });

  for (const game of games) {
    const cycleAt = normalizeCycleAt(game.rsvpCycleAt);
    if (!cycleAt) continue;

    changed = ensureGameEntry(observed, game.id, cycleAt) || changed;
    const entry = observed.games[game.id];
    const target = game.target ?? 0;

    const nextRsvpRank = computeBadgeMilestone(
      countPregameHeadcount(rsvps, guests, game.id),
      target,
    );
    if (nextRsvpRank > entry.rsvpRank) {
      entry.rsvpRank = nextRsvpRank;
      changed = true;
    }

    if (isGameLive(game, now)) {
      const nextCheckinRank = computeBadgeMilestone(
        countHeadcount(checkIns, guests, game.id, "live"),
        target,
      );
      if (nextCheckinRank > entry.checkinRank) {
        entry.checkinRank = nextCheckinRank;
        changed = true;
      }
    }
  }

  return changed;
}

function cycleAtMatches(storedCycleAt, pushCycleAt) {
  if (!pushCycleAt) return false;
  return normalizeCycleAt(storedCycleAt) === normalizeCycleAt(pushCycleAt);
}

export function shouldSuppressPush({ eventType, gameId, cycleAt, observed }) {
  if (!eventType || !gameId || !observed?.games) {
    return false;
  }

  const entry = observed.games[gameId];
  if (!entry || !cycleAtMatches(entry.cycleAt, cycleAt)) {
    return false;
  }

  if (isRsvpBadgeEventType(eventType)) {
    const pushRank = rsvpBadgeEventRank(eventType);
    return pushRank > 0 && entry.rsvpRank >= pushRank;
  }

  if (isCheckinBadgeEventType(eventType)) {
    const pushRank = checkinBadgeEventRank(eventType);
    return pushRank > 0 && entry.checkinRank >= pushRank;
  }

  return false;
}

export function syncObservedAlertsToServiceWorker(observed = loadObservedAlerts()) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: "sync-observed-alerts",
    data: observed,
  });
}

export function scheduleObservedAlertsServiceWorkerSync(observed) {
  if (swSyncTimer) {
    clearTimeout(swSyncTimer);
  }

  swSyncTimer = setTimeout(() => {
    swSyncTimer = null;
    syncObservedAlertsToServiceWorker(observed);
  }, SW_SYNC_DEBOUNCE_MS);
}

export function flushObservedAlertsServiceWorkerSync() {
  if (swSyncTimer) {
    clearTimeout(swSyncTimer);
    swSyncTimer = null;
  }
  syncObservedAlertsToServiceWorker();
}

export function initObservedAlertsSync() {
  if (typeof window === "undefined") return () => {};

  flushObservedAlertsServiceWorkerSync();

  const onHide = () => {
    if (document.visibilityState === "hidden") {
      flushObservedAlertsServiceWorkerSync();
    }
  };

  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flushObservedAlertsServiceWorkerSync);

  return () => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flushObservedAlertsServiceWorkerSync);
    if (swSyncTimer) {
      clearTimeout(swSyncTimer);
      swSyncTimer = null;
    }
  };
}
