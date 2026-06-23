import { useCallback, useState } from "react";
import { createGroup } from "../lib/data.js";
import { getPlatformAdminPasscode } from "./usePlatformAdminSession.js";

export function usePlatformAdminActions({ showToast, refresh }) {
  const [showLogin, setShowLogin] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreate = useCallback(() => setCreateModal(true), []);
  const closeCreateModal = useCallback(() => {
    if (saving) return;
    setCreateModal(false);
  }, [saving]);

  const saveGroup = useCallback(
    async (form) => {
      const secret = getPlatformAdminPasscode();
      if (!secret) {
        showToast("Admin session expired", "error");
        return;
      }

      setSaving(true);
      try {
        await createGroup(secret, form);
        showToast("Group created");
        await refresh();
        setCreateModal(false);
      } catch (error) {
        const rawMessage = error?.message ?? "";
        let message = "Couldn't create group — try again";
        if (rawMessage.includes("invalid platform admin passcode")) {
          message = "Admin passcode out of sync — sign in again";
        } else if (rawMessage.includes("group id already exists")) {
          message = "That group id is already taken — try again";
        } else if (rawMessage.includes("group admin passcode must be 4 digits")) {
          message = "Group passcode must be 4 digits";
        }
        showToast(message, "error");
      } finally {
        setSaving(false);
      }
    },
    [refresh, showToast],
  );

  return {
    showLogin,
    createModal,
    saving,
    setShowLogin,
    openCreate,
    closeCreateModal,
    saveGroup,
  };
}
