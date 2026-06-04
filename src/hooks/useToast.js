import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3000;
const TOAST_EXIT_MS = 200;

export function useToast() {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);
  const dismissTimerRef = useRef(null);
  const exitTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearTimers();
    setExiting(true);
    exitTimerRef.current = window.setTimeout(() => {
      setToast(null);
      setExiting(false);
      exitTimerRef.current = null;
    }, TOAST_EXIT_MS);
  }, [clearTimers]);

  const showToast = useCallback(
    (msg, type = "success") => {
      clearTimers();
      setExiting(false);
      setToast({ msg, type });
      dismissTimerRef.current = window.setTimeout(dismissToast, TOAST_DURATION_MS);
    },
    [clearTimers, dismissToast],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { toast, exiting, showToast, dismissToast };
}
