import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import {
  fetchAppData,
  fetchProfileById,
  findProfileByPhone,
  handleCheckInAction,
  handleGuestAction,
  handleRsvpAction,
  isSupabaseConfigured,
  subscribeToCheckIns,
  subscribeToGames,
  subscribeToGuests,
  subscribeToRsvps,
  syncProfileToServer,
} from "../lib/data.js";
import { deriveMyCheckIns, deriveMyRsvps } from "../utils/games.js";
import { normalizePhone } from "../utils/phone.js";
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

async function syncProfileFromServer(localProfile) {
  if (!localProfile?.id || !isSupabaseConfigured()) return localProfile;

  try {
    const remote = await fetchProfileById(localProfile.id);
    if (!remote) return localProfile;

    const merged = {
      ...localProfile,
      name: remote.name,
      phone: remote.phone ?? localProfile.phone ?? null,
      bubbleColor: remote.bubbleColor || localProfile.bubbleColor,
    };

    if (
      merged.name !== localProfile.name ||
      merged.phone !== localProfile.phone ||
      merged.bubbleColor !== localProfile.bubbleColor
    ) {
      saveProfile(merged);
    }

    return merged;
  } catch {
    return localProfile;
  }
}

function applyData(
  { games, rsvps, checkIns, guests },
  setGamesMeta,
  setRsvps,
  setCheckIns,
  setGuests,
) {
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
  if (guests) {
    setGuests(guests);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(guests));
  }
}

function shouldApplyServerData(data, latestFetchSeqRef) {
  if (!data?.fetchSeq) return true;
  if (data.fetchSeq < latestFetchSeqRef.current) return false;
  latestFetchSeqRef.current = data.fetchSeq;
  return true;
}

export function useAppData(showToast) {
  const [profile, setProfile] = useState(null);
  const [gamesMeta, setGamesMeta] = useState([]);
  const [rsvps, setRsvps] = useState({});
  const [checkIns, setCheckIns] = useState({});
  const [guests, setGuests] = useState({});
  const [myRsvps, setMyRsvps] = useState({});
  const [myCheckIns, setMyCheckIns] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingGameId, setSavingGameId] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [pendingRsvp, setPendingRsvp] = useState(null);
  const [pendingCheckIn, setPendingCheckIn] = useState(null);

  const useSupabaseRef = useRef(isSupabaseConfigured());
  const profileRef = useRef(null);
  const latestFetchSeqRef = useRef(0);

  const applyServerData = useCallback((data) => {
    if (!shouldApplyServerData(data, latestFetchSeqRef)) return;
    applyData(data, setGamesMeta, setRsvps, setCheckIns, setGuests);
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        let storedProfile = getStoredJson(STORAGE_KEYS.PROFILE) ?? migrateLegacyUser();
        if (storedProfile && useSupabaseRef.current) {
          storedProfile = await syncProfileFromServer(storedProfile);
        }
        if (storedProfile && !cancelled) {
          setProfile(storedProfile);
        }

        if (!useSupabaseRef.current) {
          return;
        }

        const data = await fetchAppData();
        if (cancelled) return;
        applyServerData(data);
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
      applyServerData(data);
      const local = profileRef.current;
      if (!local?.id) return;
      syncProfileFromServer(local).then((merged) => {
        if (
          merged.name !== local.name ||
          merged.phone !== local.phone ||
          merged.bubbleColor !== local.bubbleColor
        ) {
          setProfile(merged);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToCheckIns((data) => {
      applyServerData(data);
      const local = profileRef.current;
      if (!local?.id) return;
      syncProfileFromServer(local).then((merged) => {
        if (
          merged.name !== local.name ||
          merged.phone !== local.phone ||
          merged.bubbleColor !== local.bubbleColor
        ) {
          setProfile(merged);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToGuests((data) => {
      applyServerData(data);
    });
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const local = profileRef.current;
      if (!local?.id) return;
      syncProfileFromServer(local).then((merged) => {
        if (
          merged.name !== local.name ||
          merged.phone !== local.phone ||
          merged.bubbleColor !== local.bubbleColor
        ) {
          setProfile(merged);
        }
      });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!useSupabaseRef.current) return undefined;

    return subscribeToGames((data) => {
      applyServerData(data);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!useSupabaseRef.current) return;
    const data = await fetchAppData();
    applyServerData(data);
    return data;
  }, [applyServerData]);

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
        applyServerData(data);
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
        applyServerData(data);
      }
      return true;
    } catch {
      showToast("Couldn't save — try again", "error");
      return false;
    } finally {
      setSavingGameId(null);
    }
  };

  const handleRsvp = async (game, plusOnes, rsvpProfile = profile, bringingKit = false) => {
    if (!rsvpProfile) return;
    if (!isRsvpOpen(game)) {
      showToast("RSVP is locked — game has started", "error");
      return;
    }

    const previous = getStoredJson(STORAGE_KEYS.RSVPS) || {};
    const current = { ...previous };
    const entries = (current[game.id] || []).filter((entry) => entry.userId !== rsvpProfile.id);
    entries.push({
      userId: rsvpProfile.id,
      name: rsvpProfile.name,
      plusOnes,
      bringingKit,
    });
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
        bringingKit,
      },
      game.id,
    );

    if (!ok) {
      setRsvps(previous);
      localStorage.setItem(STORAGE_KEYS.RSVPS, JSON.stringify(previous));
      return;
    }

    const kitText = bringingKit ? " · bringing kit" : "";
    showToast(
      `You're in!${plusOnes > 0 ? ` +${plusOnes} plus one${plusOnes !== 1 ? "s" : ""}` : ""}${kitText}`,
    );
    setPendingRsvp(null);
    setPendingCheckIn(null);
    setShowSignUp(false);
  };

  const handleRequestRsvp = (game, plusOnes = 0, bringingKit = false) => {
    if (!isRsvpOpen(game)) {
      showToast("RSVP is locked — game has started", "error");
      return;
    }
    if (profile) {
      handleRsvp(game, plusOnes, profile, bringingKit);
      return;
    }
    setPendingCheckIn(null);
    setPendingRsvp({ game, plusOnes, bringingKit });
    setShowSignUp(true);
  };

  const handleCheckIn = async (game, plusOnes, checkInProfile = profile, bringingKit = false) => {
    if (!checkInProfile) return;
    if (!isGameLive(game)) {
      showToast("Check-in opens when the game starts", "error");
      return;
    }

    const cycleAt = getOccurrenceStartUtc(game);
    if (!cycleAt) return;

    const previous = getStoredJson(STORAGE_KEYS.CHECK_INS) || {};
    const current = { ...previous };
    const entries = (current[game.id] || []).filter((entry) => entry.userId !== checkInProfile.id);
    entries.push({
      userId: checkInProfile.id,
      name: checkInProfile.name,
      plusOnes,
      bringingKit,
    });
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
        bringingKit,
        cycleAt,
      },
      game.id,
    );

    if (!ok) {
      setCheckIns(previous);
      localStorage.setItem(STORAGE_KEYS.CHECK_INS, JSON.stringify(previous));
      return;
    }

    const kitText = bringingKit ? " · has kit" : "";
    showToast(
      `You're here!${plusOnes > 0 ? ` +${plusOnes} guest${plusOnes !== 1 ? "s" : ""}` : ""}${kitText}`,
    );
    setPendingCheckIn(null);
    setPendingRsvp(null);
    setShowSignUp(false);
  };

  const handleRequestCheckIn = (game, plusOnes = 0, bringingKit = false) => {
    if (!isGameLive(game)) {
      showToast("Check-in opens when the game starts", "error");
      return;
    }
    if (profile) {
      handleCheckIn(game, plusOnes, profile, bringingKit);
      return;
    }
    setPendingRsvp(null);
    setPendingCheckIn({ game, plusOnes, bringingKit });
    setShowSignUp(true);
  };

  const handleSignUp = async ({ name, phone }) => {
    const trimmedName = name.trim();
    const normalizedPhone = normalizePhone(phone);
    const savingId = pendingRsvp?.game?.id ?? pendingCheckIn?.game?.id ?? "profile";
    setSavingGameId(savingId);

    try {
      let id = profile?.id;
      let bubbleColor = profile?.bubbleColor;
      let recovered = false;
      let existing = null;

      if (!id && normalizedPhone && useSupabaseRef.current) {
        existing = await findProfileByPhone(normalizedPhone);
        if (existing) {
          id = existing.id;
          bubbleColor = existing.bubbleColor || colorForId(id);
          recovered = true;
        }
      }

      if (!id) {
        id = getPresenceSessionId(null);
      }

      if (!bubbleColor) {
        bubbleColor = colorForId(id);
      }

      let nextProfile;

      if (recovered && existing) {
        nextProfile = {
          id: existing.id,
          name: existing.name,
          bubbleColor: existing.bubbleColor || bubbleColor,
          phone: existing.phone || normalizedPhone,
        };
      } else {
        nextProfile = {
          id,
          name: trimmedName,
          bubbleColor,
          phone: normalizedPhone,
        };

        if (useSupabaseRef.current && normalizedPhone) {
          nextProfile = await syncProfileToServer(nextProfile);
          nextProfile.bubbleColor = nextProfile.bubbleColor || bubbleColor;
        }
      }

      saveProfile(nextProfile);
      setProfile(nextProfile);

      if (recovered) {
        showToast(
          trimmedName !== existing.name
            ? `Welcome back, ${existing.name}`
            : "Welcome back",
        );
      }

      if (pendingRsvp) {
        await handleRsvp(pendingRsvp.game, pendingRsvp.plusOnes, nextProfile, pendingRsvp.bringingKit);
      } else if (pendingCheckIn) {
        await handleCheckIn(
          pendingCheckIn.game,
          pendingCheckIn.plusOnes,
          nextProfile,
          pendingCheckIn.bringingKit,
        );
      } else {
        setShowSignUp(false);
        setSavingGameId(null);
      }
    } catch (error) {
      const message = error?.message?.includes("phone already linked")
        ? "That phone is linked to another profile"
        : "Couldn't save — try again";
      showToast(message, "error");
      setSavingGameId(null);
    }
  };

  const handleCancel = async (gameId) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (game && !isRsvpOpen(game)) {
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

    if (ok) showToast("Cancelled");
  };

  const persistGuestChange = async (payload, gameIdForSaving) => {
    setSavingGameId(gameIdForSaving);
    try {
      if (useSupabaseRef.current) {
        const data = await handleGuestAction(payload);
        applyServerData(data);
      }
      return true;
    } catch {
      showToast("Couldn't save — try again", "error");
      return false;
    } finally {
      setSavingGameId(null);
    }
  };

  const handleAddWalkIn = async (gameId, name) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (!game || !isGameLive(game)) {
      showToast("Walk-ins can be added after the game starts", "error");
      return;
    }

    const cycleAt = getOccurrenceStartUtc(game);
    if (!cycleAt) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const current = getStoredJson(STORAGE_KEYS.GUESTS) || {};
    const nextEntry = { id: `local_${Date.now()}`, name: trimmed };
    current[gameId] = [...(current[gameId] || []), nextEntry];
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(current));
    setGuests({ ...current });

    const ok = await persistGuestChange(
      { action: "add", gameId, name: trimmed, cycleAt },
      gameId,
    );

    if (ok) showToast(`${trimmed} added`);
  };

  const handleRemoveWalkIn = async (gameId, guestId) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (!game || !isGameLive(game)) return;

    const current = getStoredJson(STORAGE_KEYS.GUESTS) || {};
    const removed = (current[gameId] || []).find((entry) => entry.id === guestId);
    current[gameId] = (current[gameId] || []).filter((entry) => entry.id !== guestId);
    localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(current));
    setGuests({ ...current });

    const ok = await persistGuestChange({ action: "remove", guestId }, gameId);

    if (ok && removed) showToast(`${removed.name} removed`);
  };

  const handleCheckOut = async (gameId) => {
    if (!profile) return;

    const game = gamesMeta.find((item) => item.id === gameId);
    if (!game || !isGameLive(game)) {
      showToast("Check-in is closed", "error");
      return;
    }

    const cycleAt = getOccurrenceStartUtc(game);
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

  const handleRecoverProfile = async (existingProfile) => {
    if (!existingProfile?.id) return;

    setSavingGameId("profile");

    try {
      const nextProfile = {
        id: existingProfile.id,
        name: existingProfile.name,
        phone: existingProfile.phone ?? null,
        bubbleColor: existingProfile.bubbleColor || colorForId(existingProfile.id),
      };

      saveProfile(nextProfile);
      setProfile(nextProfile);

      if (useSupabaseRef.current) {
        const data = await fetchAppData();
        applyServerData(data);
      }

      setShowEditProfile(false);
      showToast(`Switched to ${nextProfile.name}`);
    } catch {
      showToast("Couldn't switch profile — try again", "error");
    }

    setSavingGameId(null);
  };

  const handleUpdateProfile = async ({ name, bubbleColor, phone }) => {
    if (!profile) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const normalizedPhone = normalizePhone(phone);
    const removedPhone = Boolean(profile.phone) && !normalizedPhone;
    setSavingGameId("profile");

    try {
      if (normalizedPhone && useSupabaseRef.current) {
        const existing = await findProfileByPhone(normalizedPhone);
        if (existing && existing.id !== profile.id) {
          throw new Error("phone already linked to another profile");
        }
      }

      let nextProfile = {
        ...profile,
        name: trimmedName,
        bubbleColor,
        phone: normalizedPhone,
      };

      if (useSupabaseRef.current) {
        nextProfile = await syncProfileToServer(nextProfile, {
          previousPhone: profile.phone,
        });
        nextProfile.bubbleColor = nextProfile.bubbleColor || bubbleColor;
      }

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
        applyServerData(data);
      }

      setShowEditProfile(false);
      showToast(removedPhone ? "Phone removed" : "Profile updated");
    } catch (error) {
      const message = error?.message?.includes("phone already linked")
        ? "That phone is linked to another profile"
        : "Couldn't save — try again";
      showToast(message, "error");
    }
    setSavingGameId(null);
  };

  const lookupProfileByPhone = useCallback(async (phone) => {
    if (!useSupabaseRef.current) return null;
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    return findProfileByPhone(normalized);
  }, []);

  const validatePhoneForProfile = useCallback(async (phone, profileId) => {
    if (!useSupabaseRef.current) return true;
    const normalized = normalizePhone(phone);
    if (!normalized) return true;
    const existing = await findProfileByPhone(normalized);
    if (!existing) return true;
    return existing.id === profileId;
  }, []);

  return {
    profile,
    gamesMeta,
    rsvps,
    checkIns,
    guests,
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
    handleAddWalkIn,
    handleRemoveWalkIn,
    handleCheckOut,
    closeSignUp,
    openEditProfile,
    closeEditProfile,
    handleRecoverProfile,
    handleUpdateProfile,
    lookupProfileByPhone,
    validatePhoneForProfile,
    isRsvpd,
    isCheckedIn,
    refresh,
  };
}
