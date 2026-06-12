import { useCallback, useState } from "react";
import { createGame, deleteGame, updateGame, updateGroup } from "../lib/data.js";
import { getGroupAdminPasscode } from "./useGroupAdminSession.js";

export function useGroupAdminActions({ groupId, showToast, refresh, groupGameCount = 0 }) {
  const [gameModal, setGameModal] = useState(null);
  const [groupModal, setGroupModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => {
    if (groupGameCount >= 7) {
      showToast("Maximum 7 games per group", "error");
      return;
    }
    setGameModal({ mode: "create" });
  }, [groupGameCount, showToast]);
  const openEdit = useCallback((game) => setGameModal({ mode: "edit", game }), []);
  const openGroupSettings = useCallback(() => setGroupModal(true), []);
  const closeGameModal = useCallback(() => {
    if (saving) return;
    setGameModal(null);
  }, [saving]);
  const closeGroupModal = useCallback(() => {
    if (saving) return;
    setGroupModal(false);
  }, [saving]);

  const requestDelete = useCallback(() => {
    if (gameModal?.mode !== "edit" || !gameModal.game) return;
    const game = gameModal.game;
    setGameModal(null);
    setDeleteTarget(game);
  }, [gameModal]);

  const openDelete = useCallback((game) => setDeleteTarget(game), []);
  const closeDelete = useCallback(() => {
    if (saving) return;
    setDeleteTarget(null);
  }, [saving]);

  const saveGame = useCallback(
    async (form) => {
      const secret = getGroupAdminPasscode(groupId);
      if (!secret) {
        showToast("Admin session expired", "error");
        return;
      }

      setSaving(true);
      try {
        const payload = { ...form, groupId };
        if (gameModal?.mode === "edit" && gameModal.game) {
          await updateGame(secret, gameModal.game.id, payload);
          showToast("Game updated");
        } else {
          await createGame(secret, payload);
          showToast("Game created");
        }
        await refresh();
        setGameModal(null);
      } catch (error) {
        const rawMessage = error?.message ?? "";
        let message = "Couldn't save game — try again";
        if (rawMessage.includes("invalid group admin passcode")) {
          message = "Admin passcode out of sync — sign in again";
        } else if (rawMessage.includes("maximum of 7 games")) {
          message = "This group already has 7 games";
        } else if (rawMessage.includes("game on this weekday")) {
          message = "That day already has a game";
        }
        showToast(message, "error");
      } finally {
        setSaving(false);
      }
    },
    [gameModal, groupId, refresh, showToast],
  );

  const saveGroup = useCallback(
    async (form) => {
      const secret = getGroupAdminPasscode(groupId);
      if (!secret) {
        showToast("Admin session expired", "error");
        return;
      }

      setSaving(true);
      try {
        await updateGroup(secret, { id: groupId, ...form });
        showToast("Group updated");
        await refresh();
        setGroupModal(false);
      } catch {
        showToast("Couldn't save group — try again", "error");
      } finally {
        setSaving(false);
      }
    },
    [groupId, refresh, showToast],
  );

  const executeDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const secret = getGroupAdminPasscode(groupId);
    if (!secret) {
      showToast("Admin session expired", "error");
      return;
    }

    setSaving(true);
    try {
      await deleteGame(secret, deleteTarget.id);
      await refresh();
      showToast("Game deleted");
      setDeleteTarget(null);
    } catch {
      showToast("Couldn't delete game — try again", "error");
    } finally {
      setSaving(false);
    }
  }, [deleteTarget, groupId, refresh, showToast]);

  return {
    gameModal,
    groupModal,
    deleteTarget,
    showLogin,
    saving,
    setShowLogin,
    openCreate,
    openEdit,
    openGroupSettings,
    closeGameModal,
    closeGroupModal,
    requestDelete,
    openDelete,
    closeDelete,
    saveGame,
    saveGroup,
    executeDelete,
  };
}
