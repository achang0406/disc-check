/** In-memory only — cleared on refresh; not stored in URL or history. */
let preferLanding = false;

export function markBackToLanding() {
  preferLanding = true;
}

export function clearBackToLanding() {
  preferLanding = false;
}

export function shouldStayOnLanding() {
  return preferLanding;
}
