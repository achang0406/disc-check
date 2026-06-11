import { useEffect, useRef } from "react";
import {
  loadObservedAlerts,
  recordGameBadgeObservations,
  saveObservedAlerts,
  scheduleObservedAlertsServiceWorkerSync,
} from "../lib/observedAlerts.js";

export function useObservedAlerts({
  games,
  groupGames,
  rsvps,
  checkIns,
  guests,
  now,
}) {
  const observedRef = useRef(loadObservedAlerts());

  useEffect(() => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    if (!groupGames?.length) {
      return;
    }

    const observed = observedRef.current;
    const changed = recordGameBadgeObservations(observed, {
      games: groupGames,
      allGames: games,
      rsvps,
      checkIns,
      guests,
      now,
    });

    if (changed) {
      saveObservedAlerts(observed);
      scheduleObservedAlertsServiceWorkerSync(observed);
    }
  }, [games, groupGames, rsvps, checkIns, guests, now]);
}
