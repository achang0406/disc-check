/** Keep keyboard focus rings; skip the brief mouse-click focus flash. */
export function suppressMouseFocus(event) {
  if (event.button === 0) {
    event.preventDefault();
  }
}
