import { useCallback, useMemo, useState } from "react";
import { getWelcomeSteps, WELCOME_STORAGE_KEY } from "../constants/welcome.js";

function isWelcomeSeen() {
  if (typeof window === "undefined") return true;

  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markWelcomeSeen() {
  localStorage.setItem(WELCOME_STORAGE_KEY, "1");
}

export function useWelcomeModal({ groupCount, showInstallStep = false }) {
  const [hasSeenWelcomeBefore] = useState(() => isWelcomeSeen());
  const [isActive, setIsActive] = useState(() => !isWelcomeSeen());
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(
    () => getWelcomeSteps(groupCount, { showInstallStep }),
    [groupCount, showInstallStep],
  );

  const finish = useCallback(() => {
    markWelcomeSeen();
    setIsActive(false);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      finish();
      return;
    }
    setStepIndex((index) => index + 1);
  }, [finish, stepIndex, steps.length]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const currentStep = isActive ? steps[stepIndex] ?? null : null;

  return {
    isActive,
    hasSeenWelcomeBefore,
    stepIndex,
    currentStep,
    totalSteps: steps.length,
    canGoBack: stepIndex > 0,
    next,
    back,
    skip,
  };
}
