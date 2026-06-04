import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function sessionKey(groupId) {
  return `disc-check:group-admin:${groupId}`;
}

function readSession(groupId) {
  try {
    const raw = sessionStorage.getItem(sessionKey(groupId));
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.passcode || !session?.exp || Date.now() >= session.exp) {
      sessionStorage.removeItem(sessionKey(groupId));
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(sessionKey(groupId));
    return null;
  }
}

function storeSession(groupId, passcode) {
  sessionStorage.setItem(
    sessionKey(groupId),
    JSON.stringify({
      passcode,
      exp: Date.now() + SESSION_TTL_MS,
    }),
  );
}

export function getGroupAdminPasscode(groupId) {
  if (!groupId) return null;
  return readSession(groupId)?.passcode ?? null;
}

export function isGroupAdminAuthenticated(groupId) {
  if (!groupId) return false;
  return Boolean(readSession(groupId));
}

export async function loginGroupAdmin(groupId, passcode) {
  if (!groupId || !passcode) return false;

  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("verify_group_admin", {
    p_group_id: groupId,
    p_secret: passcode,
  });
  if (error || !data) return false;

  storeSession(groupId, passcode);
  return true;
}

export function logoutGroupAdmin(groupId) {
  if (!groupId) return;
  sessionStorage.removeItem(sessionKey(groupId));
}

export function useGroupAdminSession(groupId) {
  const [isAdmin, setIsAdmin] = useState(() => isGroupAdminAuthenticated(groupId));

  useEffect(() => {
    setIsAdmin(isGroupAdminAuthenticated(groupId));
  }, [groupId]);

  useEffect(() => {
    const sync = () => setIsAdmin(isGroupAdminAuthenticated(groupId));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [groupId]);

  const login = useCallback(
    async (passcode) => {
      const ok = await loginGroupAdmin(groupId, passcode);
      if (ok) setIsAdmin(true);
      return ok;
    },
    [groupId],
  );

  const logout = useCallback(() => {
    logoutGroupAdmin(groupId);
    setIsAdmin(false);
  }, [groupId]);

  return { isAdmin, login, logout };
}
