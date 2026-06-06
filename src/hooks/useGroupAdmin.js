import { useCallback, useState } from "react";
import {
  createGame,
  deleteGame,
  postGameAnnouncement,
  updateGame,
  updateGroup,
} from "../lib/data.js";
import { getGroupAdminPasscode } from "./useGroupAdminSession.js";

export function useGroupAdminActions({ groupId, showToast, refresh }) {
  const [gameModal, setGameModal] = useState(null);
  const [groupModal, setGroupModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingAnnouncementGameId, setPostingAnnouncementGameId] = useState(null);

  const openCreate = useCallback(() => setGameModal({ mode: "create" }), []);
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
        const raw = error?.message ?? "";
        const message = raw.includes("invalid group admin passcode")
          ? "Admin passcode out of sync — sign in again"
          : raw.includes("group game limit reached")
            ? "Maximum 7 games per group"
            : raw.includes("already has a game on that day")
              ? "This group already has a game on that day"
              : "Couldn't save game — try again";
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

  const postAnnouncement = useCallback(
    async ({ gameId, message, subscriberId }) => {
      const secret = getGroupAdminPasscode(groupId);
      if (!secret) {
        showToast("Admin session expired", "error");
        return false;
      }

      setPostingAnnouncementGameId(gameId);
      try {
        await postGameAnnouncement({
          secret,
          gameId,
          message,
          subscriberId,
        });
        await refresh();
        showToast("Announcement posted");
        return true;
      } catch {
        showToast("Couldn't post announcement — try again", "error");
        return false;
      } finally {
        setPostingAnnouncementGameId(null);
      }
    },
    [groupId, refresh, showToast],
  );

  return {
    gameModal,
    groupModal,
    deleteTarget,
    showLogin,
    saving,
    postingAnnouncementGameId,
    postAnnouncement,
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
