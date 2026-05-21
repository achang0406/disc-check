import { useCallback, useState } from "react";
import { createGame, deleteGame, updateGame } from "../lib/data.js";
import { getAdminPasscode } from "./useAdminSession.js";

export function useAdminActions({ showToast, refresh }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => setModal({ mode: "create" }), []);
  const openEdit = useCallback((game) => setModal({ mode: "edit", game }), []);
  const closeModal = useCallback(() => {
    if (saving) return;
    setModal(null);
  }, [saving]);

  const requestDelete = useCallback(() => {
    if (modal?.mode !== "edit" || !modal.game) return;
    const game = modal.game;
    setModal(null);
    setDeleteTarget(game);
  }, [modal]);

  const openDelete = useCallback((game) => setDeleteTarget(game), []);
  const closeDelete = useCallback(() => {
    if (saving) return;
    setDeleteTarget(null);
  }, [saving]);

  const saveGame = useCallback(
    async (form) => {
      const secret = getAdminPasscode();
      if (!secret) {
        showToast("Admin session expired", "error");
        return;
      }

      setSaving(true);
      try {
        if (modal?.mode === "edit" && modal.game) {
          await updateGame(secret, modal.game.id, form);
          showToast("Game updated");
        } else {
          await createGame(secret, form);
          showToast("Game created");
        }
        await refresh();
        setModal(null);
      } catch {
        showToast("Couldn't save game — try again", "error");
      } finally {
        setSaving(false);
      }
    },
    [modal, refresh, showToast],
  );

  const executeDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const secret = getAdminPasscode();
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
  }, [deleteTarget, refresh, showToast]);

  return {
    modal,
    deleteTarget,
    showLogin,
    setShowLogin,
    saving,
    openCreate,
    openEdit,
    closeModal,
    requestDelete,
    openDelete,
    closeDelete,
    saveGame,
    executeDelete,
  };
}
