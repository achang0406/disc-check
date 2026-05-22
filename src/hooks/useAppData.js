import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import {
  fetchAppData,
  handleCheckInAction,
  handleRsvpAction,
  isSupabaseConfigured,
  subscribeToCheckIns,
  subscribeToGames,
  subscribeToRsvps,
} from "../lib/data.js";
import { deriveMyCheckIns, deriveMyRsvps } from "../utils/games.js";
import { getOccurrenceStartUtc, isGameLive, isRsvpOpen } from "../utils/gameSchedule.js";
import { colorForId, getPresenceSessionId } from "../constants/presence.js";

function getStoredJson(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

function migrateLegacyUser() {
  const legacyUser = getStoredJson("frisbee_user");
  if (!legacyUser) return null;

  const profile = {
    id: legacyUser.id,
    name: legacyUser.name,
    bubbleColor: colorForId(legacyUser.id),
  };
  saveProfile(profile);
  localStorage.removeItem("frisbee_user");
  return profile;
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

function applyData({ games, rsvps, checkIns }, setGamesMeta, setRsvps, setCheckIns) {
  if (games) {
    setGamesMeta(games);
  }
  if (rsvps) {
    setRsvps(rsvps);
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(rsvps));
  }
  if (checkIns) {
    setCheckIns(checkIns);
    localStorage.setItem(STORAGE_KEYS.CHECK_INS, JSON.stringify(checkIns));
  }
}

export function useAppData(showToast) {
  const [profile, setProfile] = useState(null);
  const [gamesMeta, setGamesMeta] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [checkIns, setCheckIns] = useState({});
  const [myRsvps, setMyRsvps] = useState({});
  const [myCheckIns, setMyCheckIns] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingGameId, setSavingGameId] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [pendingRsvp, setPendingRsvp] = useState(null);
  const [pendingCheckIn, setPendingCheckIn] = useState(null);

  const useSupabaseRef = useRef(isSupabaseConfigured());

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const storedProfile = getStoredJson(STORAGE_KEYS.PROFILE) ?? migrateLegacyUser();
        if (storedProfile && !cancelled) {
          setProfile(storedProfile);
        }

        if (!useSupabaseRef.current) {
          return;
        }

        const data = await fetchAppData();
        if (cancelled) return;
        applyData(data, setGamesMeta, setRsvps, setCheckIns);
      } catch {
        if (!cancelled) {
          showToast("Couldn't load games — try again", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToRsvps((data) => {
      applyData(data, setGamesMeta, setRsvps, setCheckIns);
    });
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToCheckIns((data) => {
      applyData(data, setGamesMeta, setRsvps, setCheckIns);
    });
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToGames((data) => {
      applyData(data, setGamesMeta, setRsvps, setCheckIns);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!useSupabaseRef.current) return;
    const data = await fetchAppData();
    applyData(data, setGamesMeta, setRsvps, setCheckIns);
    return data;
  }, []);

  useEffect(() => {
    setMyRsvps(deriveMyRsvps(rsvps, profile?.id));
  }, [rsvps, profile?.id]);

  useEffect(() => {
    setMyCheckIns(deriveMyCheckIns(checkIns, profile?.id));
  }, [checkIns, profile?.id]);

  const isRsvpd = useCallback((gameId) => !!myRsvps[gameId], [myRsvps]);
  const isCheckedIn = useCallback((gameId) => !!myCheckIns[gameId], [myCheckIns]);

  const persistRsvpChange = async (payload, gameIdForSaving) => {
    setSavingGameId(gameIdForSaving);
    try {
      if (useSupabaseRef.current) {
        const data = await handleRsvpAction(payload);
        applyData(data, setGamesMeta, setRsvps, setCheckIns);
      }
      return true;
    } catch {
      showToast("Couldn't save — try again", "error");
      return false;
    } finally {
      setSavingGameId(null);
    }
  };

  const persistCheckInChange = async (payload, gameIdForSaving) => {
    setSavingGameId(gameIdForSaving);
    try {
      if (useSupabaseRef.current) {
        const data = await handleCheckInAction(payload);
        applyData(data, setGamesMeta, setRsvps, setCheckIns);
      }
      return true;
    } catch {
      showToast("Couldn't save — try again", "error");
      return false;
    } finally {
      setSavingGameId(null);
    }
  };

  const handleRsvp = async (game, plusOnes, rsvpProfile = profile) => {
    if (!rsvpProfile) return;
    if (!isRsvpOpen(game.startsAt)) {
      showToast("RSVP is locked — game has started", "error");
      return;
    }

    const current = getStoredJson(STORAGE_KEYS.RSVPS) || {};
    const entries = (current[game.id] || []).filter((entry) => entry.userId !== rsvpProfile.id);
    entries.push({ userId: rsvpProfile.id, name: rsvpProfile.name, plusOnes });
    current[game.id] = entries;
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(current));
    setRsvps({ ...current });

    const ok = await persistRsvpChange(
      {
        action: "rsvp",
        gameId: game.id,
        userId: rsvpProfile.id,
        name: rsvpProfile.name,
        plusOnes,
      },
      game.id,
    );

    if (!ok) return;

    showToast(
      `You're in!${plusOnes > 0 ? ` +${plusOnes} plus one${plusOnes !== 1 ? "s" : ""}` : ""}`,
    );
    setPendingRsvp(null);
    setPendingCheckIn(null);
    setShowSignUp(false);
  };

  const handleRequestRsvp = (game, plusOnes = 0) => {
    if (!isRsvpOpen(game.startsAt)) {
      showToast("RSVP is locked — game has started", "error");
      return;
    }
    if (profile) {
      handleRsvp(game, plusOnes, profile);
      return;
    }
    setPendingCheckIn(null);
    setPendingRsvp({ game, plusOnes });
    setShowSignUp(true);
  };

  const handleCheckIn = async (game, plusOnes, checkInProfile = profile) => {
    if (!checkInProfile) return;
    if (!isGameLive(game.startsAt)) {
      showToast("Check-in opens when the game starts", "error");
      return;
    }

    const cycleAt = getOccurrenceStartUtc(game.startsAt);
    if (!cycleAt) return;

    const current = getStoredJson(STORAGE_KEYS.CHECK_INS) || {};
    const entries = (current[game.id] || []).filter((entry) => entry.userId !== checkInProfile.id);
    entries.push({ userId: checkInProfile.id, name: checkInProfile.name, plusOnes });
    current[game.id] = entries;
    localStorage.setItem(STORAGE_KEYS.CHECK_INS, JSON.stringify(current));
    setCheckIns({ ...current });

    const ok = await persistCheckInChange(
      {
        action: "check_in",
        gameId: game.id,
        userId: checkInProfile.id,
        name: checkInProfile.name,
        plusOnes,
        cycleAt,
      },
      game.id,
    );

    if (!ok) return;

    showToast(
      `You're here!${plusOnes > 0 ? ` +${plusOnes} guest${plusOnes !== 1 ? "s" : ""}` : ""}`,
    );
    setPendingCheckIn(null);
    setPendingRsvp(null);
    setShowSignUp(false);
  };

  const handleRequestCheckIn = (game, plusOnes = 0) => {
    if (!isGameLive(game.startsAt)) {
      showToast("Check-in opens when the game starts", "error");
      return;
    }
    if (profile) {
      handleCheckIn(game, plusOnes, profile);
      return;
    }
    setPendingRsvp(null);
    setPendingCheckIn({ game, plusOnes });
    setShowSignUp(true);
  };

  const handleSignUp = ({ name }) => {
    setSavingGameId(pendingRsvp?.game?.id ?? pendingCheckIn?.game?.id ?? null);
    try {
      const id = profile?.id || getPresenceSessionId(null);
      const nextProfile = profile
        ? { ...profile, name }
        : { id, name, bubbleColor: colorForId(id) };

      saveProfile(nextProfile);
      setProfile(nextProfile);

      if (pendingRsvp) {
        handleRsvp(pendingRsvp.game, pendingRsvp.plusOnes, nextProfile);
      } else if (pendingCheckIn) {
        handleCheckIn(pendingCheckIn.game, pendingCheckIn.plusOnes, nextProfile);
      } else {
        setShowSignUp(false);
        setSavingGameId(null);
      }
    } catch {
      showToast("Couldn't save — try again", "error");
      setSavingGameId(null);
    }
  };

  const handleCancel = async (gameId) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (game && !isRsvpOpen(game.startsAt)) {
      showToast("RSVP is locked — game has started", "error");
      return;
    }

    const current = getStoredJson(STORAGE_KEYS.RSVPS) || {};
    current[gameId] = (current[gameId] || []).filter((entry) => entry.userId !== profile.id);
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(current));
    setRsvps({ ...current });

    const ok = await persistRsvpChange(
      { action: "cancel", gameId, userId: profile.id },
      gameId,
    );

    if (ok) showToast("RSVP cancelled");
  };

  const handleCheckOut = async (gameId) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (!game || !isGameLive(game.startsAt)) {
      showToast("Check-in is closed", "error");
      return;
    }

    const cycleAt = getOccurrenceStartUtc(game.startsAt);
    if (!cycleAt) return;

    const current = getStoredJson(STORAGE_KEYS.CHECK_INS) || {};
    current[gameId] = (current[gameId] || []).filter((entry) => entry.userId !== profile.id);
    localStorage.setItem(STORAGE_KEYS.CHECK_INS, JSON.stringify(current));
    setCheckIns({ ...current });

    const ok = await persistCheckInChange(
      { action: "check_out", gameId, userId: profile.id, cycleAt },
      gameId,
    );

    if (ok) showToast("Checked out");
  };

  const closeSignUp = () => {
    if (savingGameId) return;
    setShowSignUp(false);
    setPendingRsvp(null);
    setPendingCheckIn(null);
  };

  const openEditProfile = () => {
    if (profile) setShowEditProfile(true);
  };

  const closeEditProfile = () => {
    if (savingGameId) return;
    setShowEditProfile(false);
  };

  const handleUpdateProfile = async ({ name, bubbleColor }) => {
    if (!profile) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSavingGameId("profile");
    try {
      const nextProfile = { ...profile, name: trimmedName, bubbleColor };
      saveProfile(nextProfile);
      setProfile(nextProfile);

      const currentRsvps = getStoredJson(STORAGE_KEYS.RSVPS) || {};
      const nextRsvps = Object.fromEntries(
        Object.entries(currentRsvps).map(([gameId, entries]) => [
          gameId,
          entries.map((entry) =>
            entry.userId === profile.id ? { ...entry, name: trimmedName } : entry,
          ),
        ]),
      );
      localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(nextRsvps));
      setRsvps(nextRsvps);

      const currentCheckIns = getStoredJson(STORAGE_KEYS.CHECK_INS) || {};
      const nextCheckIns = Object.fromEntries(
        Object.entries(currentCheckIns).map(([gameId, entries]) => [
          gameId,
          entries.map((entry) =>
            entry.userId === profile.id ? { ...entry, name: trimmedName } : entry,
          ),
        ]),
      );
      localStorage.setItem(STORAGE_KEYS.CHECK_INS, JSON.stringify(nextCheckIns));
      setCheckIns(nextCheckIns);

      if (useSupabaseRef.current) {
        const data = await handleRsvpAction({
          action: "rename",
          userId: profile.id,
          name: trimmedName,
        });
        applyData(data, setGamesMeta, setRsvps, setCheckIns);
      }

      setShowEditProfile(false);
      showToast("Profile updated");
    } catch {
      showToast("Couldn't save — try again", "error");
    }
    setSavingGameId(null);
  };

  return {
    profile,
    gamesMeta,
    rsvps,
    checkIns,
    myRsvps,
    myCheckIns,
    loading,
    savingGameId,
    showSignUp,
    showEditProfile,
    handleRequestRsvp,
    handleRequestCheckIn,
    handleSignUp,
    handleCancel,
    handleCheckOut,
    closeSignUp,
    openEditProfile,
    closeEditProfile,
    handleUpdateProfile,
    isRsvpd,
    isCheckedIn,
    refresh,
  };
}
