export const ADMIN_SESSION_CHANGED = "disc-check-admin-session-changed";

export function notifyAdminSessionChanged() {
  window.dispatchEvent(new Event(ADMIN_SESSION_CHANGED));
}

export function logoutAllGroupAdmins() {
  const prefix = "disc-check:group-admin:";
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(prefix)) {
      sessionStorage.removeItem(key);
    }
  }
  notifyAdminSessionChanged();
}
