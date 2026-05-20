import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_GAMES } from "../constants/games.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import {
  fetchAppData,
  handleRsvpAction,
  isSupabaseConfigured,
  subscribeToRsvps,
} from "../lib/data.js";
import { createEmptyRsvpMap, deriveMyRsvps } from "../utils/games.js";
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

function applyData({ games, rsvps }, setGamesMeta, setRsvps) {
  if (games?.length) {
    setGamesMeta(games);
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(games));
  }
  if (rsvps) {
    setRsvps(rsvps);
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(rsvps));
  }
}

function loadLocalData(setGamesMeta, setRsvps) {
  const storedMeta = getStoredJson(STORAGE_KEYS.META);
  if (storedMeta) {
    setGamesMeta(storedMeta);
  } else {
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(DEFAULT_GAMES));
    setGamesMeta(DEFAULT_GAMES);
  }

  const storedRsvps = getStoredJson(STORAGE_KEYS.RSVPS);
  if (storedRsvps) {
    setRsvps(storedRsvps);
  } else {
    const initialRsvps = createEmptyRsvpMap(DEFAULT_GAMES);
    localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(initialRsvps));
    setRsvps(initialRsvps);
  }
}

export function useAppData(showToast) {
  const [profile, setProfile] = useState(null);
  const [gamesMeta, setGamesMeta] = useState(DEFAULT_GAMES);
  const [rsvps, setRsvps] = useState({});
  const [myRsvps, setMyRsvps] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingGameId, setSavingGameId] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [pendingRsvp, setPendingRsvp] = useState(null);

  const useSupabaseRef = useRef(isSupabaseConfigured());

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const storedProfile = getStoredJson(STORAGE_KEYS.PROFILE) ?? migrateLegacyUser();
        if (storedProfile && !cancelled) {
          setProfile(storedProfile);
        }

        if (useSupabaseRef.current) {
          const data = await fetchAppData();
          if (cancelled) return;
          applyData(data, setGamesMeta, setRsvps);
        } else {
          loadLocalData(setGamesMeta, setRsvps);
        }
      } catch {
        if (!cancelled) {
          loadLocalData(setGamesMeta, setRsvps);
          useSupabaseRef.current = false;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToRsvps((nextRsvps) => {
      setRsvps(nextRsvps);
      localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(nextRsvps));
    });
  }, []);

  useEffect(() => {
    const nextMyRsvps = deriveMyRsvps(rsvps, profile?.id);
    setMyRsvps(nextMyRsvps);
    localStorage.setItem(STORAGE_KEYS.MY_RSVPS, JSON.stringify(nextMyRsvps));
  }, [rsvps, profile?.id]);

  const isRsvpd = useCallback((gameId) => !!myRsvps[gameId], [myRsvps]);

  const persistRsvpChange = async (payload, gameIdForSaving) => {
    setSavingGameId(gameIdForSaving);
    try {
      if (useSupabaseRef.current) {
        const data = await handleRsvpAction(payload);
        applyData(data, setGamesMeta, setRsvps);
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
    setShowSignUp(false);
  };

  const handleRequestRsvp = (game, plusOnes = 0) => {
    if (profile) {
      handleRsvp(game, plusOnes, profile);
      return;
    }
    setPendingRsvp({ game, plusOnes });
    setShowSignUp(true);
  };

  const handleSignUp = ({ name }) => {
    setSavingGameId(pendingRsvp?.game?.id ?? null);
    try {
      const id = profile?.id || getPresenceSessionId(null);
      const nextProfile = profile
        ? { ...profile, name }
        : { id, name, bubbleColor: colorForId(id) };

      saveProfile(nextProfile);
      setProfile(nextProfile);

      if (pendingRsvp) {
        handleRsvp(pendingRsvp.game, pendingRsvp.plusOnes, nextProfile);
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

  const closeSignUp = () => {
    if (savingGameId) return;
    setShowSignUp(false);
    setPendingRsvp(null);
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

      const current = getStoredJson(STORAGE_KEYS.RSVPS) || {};
      const nextRsvps = Object.fromEntries(
        Object.entries(current).map(([gameId, entries]) => [
          gameId,
          entries.map((entry) =>
            entry.userId === profile.id ? { ...entry, name: trimmedName } : entry,
          ),
        ]),
      );
      localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(nextRsvps));
      setRsvps(nextRsvps);

      if (useSupabaseRef.current) {
        const data = await handleRsvpAction({
          action: "rename",
          userId: profile.id,
          name: trimmedName,
        });
        applyData(data, setGamesMeta, setRsvps);
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
    myRsvps,
    loading,
    savingGameId,
    showSignUp,
    showEditProfile,
    handleRequestRsvp,
    handleSignUp,
    handleCancel,
    closeSignUp,
    openEditProfile,
    closeEditProfile,
    handleUpdateProfile,
    isRsvpd,
  };
}
