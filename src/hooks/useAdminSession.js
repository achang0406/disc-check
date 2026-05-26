import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";

const SESSION_KEY = "disc-check:admin-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function isAdminConfigured() {
  return Boolean(import.meta.env.VITE_ADMIN_PASSCODE);
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.passcode || !session?.exp || Date.now() >= session.exp) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function storeSession(passcode) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      passcode,
      exp: Date.now() + SESSION_TTL_MS,
    }),
  );
}

export function getAdminPasscode() {
  return readSession()?.passcode ?? null;
}

export function isAdminAuthenticated() {
  return Boolean(readSession());
}

export async function loginAdmin(passcode) {
  if (!passcode) return false;

  if (!isSupabaseConfigured()) {
    const expected = import.meta.env.VITE_ADMIN_PASSCODE;
    if (!expected || passcode !== expected) return false;
    storeSession(passcode);
    return true;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("verify_admin_passcode", {
    p_secret: passcode,
  });
  if (error || !data) return false;

  storeSession(passcode);
  return true;
}

export function logoutAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(() => isAdminAuthenticated());
  const adminAvailable = isAdminConfigured();

  useEffect(() => {
    const sync = () => setIsAdmin(isAdminAuthenticated());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const login = useCallback(async (passcode) => {
    const ok = await loginAdmin(passcode);
    if (ok) setIsAdmin(true);
    return ok;
  }, []);

  const logout = useCallback(() => {
    logoutAdmin();
    setIsAdmin(false);
  }, []);

  return {
    adminAvailable,
    isAdmin,
    passcode: getAdminPasscode(),
    login,
    logout,
  };
}
