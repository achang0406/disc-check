import { useCallback, useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase.js";
import { ADMIN_SESSION_CHANGED, notifyAdminSessionChanged } from "./adminSessionEvents.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_KEY = "disc-check:platform-admin";

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

export function getPlatformAdminPasscode() {
  return readSession()?.passcode ?? null;
}

export function isPlatformAdminAuthenticated() {
  return Boolean(readSession());
}

export async function loginPlatformAdmin(passcode) {
  if (!passcode) return false;

  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("verify_platform_admin", {
    p_secret: passcode,
  });
  if (error || !data) return false;

  storeSession(passcode);
  notifyAdminSessionChanged();
  return true;
}

export function logoutPlatformAdmin() {
  sessionStorage.removeItem(SESSION_KEY);
  notifyAdminSessionChanged();
}

export function usePlatformAdminSession() {
  const [isAdmin, setIsAdmin] = useState(() => isPlatformAdminAuthenticated());

  const sync = useCallback(() => {
    setIsAdmin(isPlatformAdminAuthenticated());
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    window.addEventListener("storage", sync);
    window.addEventListener(ADMIN_SESSION_CHANGED, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ADMIN_SESSION_CHANGED, sync);
    };
  }, [sync]);

  const login = useCallback(async (passcode) => {
    const ok = await loginPlatformAdmin(passcode);
    if (ok) setIsAdmin(true);
    return ok;
  }, []);

  const logout = useCallback(() => {
    logoutPlatformAdmin();
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout };
}
