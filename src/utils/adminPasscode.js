export const ADMIN_PASSCODE_LENGTH = 4;

export function sanitizeAdminPasscodeInput(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, ADMIN_PASSCODE_LENGTH);
}

export function isValidAdminPasscode(value) {
  return new RegExp(`^\\d{${ADMIN_PASSCODE_LENGTH}}$`).test(String(value ?? ""));
}
