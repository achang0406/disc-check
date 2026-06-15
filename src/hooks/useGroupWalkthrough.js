import { useCallback, useEffect, useState } from "react";
import { WALKTHROUGH_STEPS, WALKTHROUGH_STORAGE_KEY } from "../constants/walkthrough.js";

function isWalkthroughCompleted() {
  if (typeof window === "undefined") return true;

  try {
    const raw = localStorage.getItem(WALKTHROUGH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed.completed);
  } catch {
    return false;
  }
}

function markWalkthroughCompleted() {
  localStorage.setItem(
    WALKTHROUGH_STORAGE_KEY,
    JSON.stringify({ completed: true, completedAt: Date.now() }),
  );
}

export function shouldShowGroupWalkthrough(hasGames) {
  return hasGames && !isWalkthroughCompleted();
}

export function useGroupWalkthrough({ hasGames }) {
  const [isActive, setIsActive] = useState(() => shouldShowGroupWalkthrough(hasGames));
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const nextActive = shouldShowGroupWalkthrough(hasGames);
    setIsActive(nextActive);
    if (nextActive) {
      setStepIndex(0);
    }
  }, [hasGames]);

  const finish = useCallback(() => {
    markWalkthroughCompleted();
    setIsActive(false);
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= WALKTHROUGH_STEPS.length - 1) {
      finish();
      return;
    }
    setStepIndex((index) => index + 1);
  }, [finish, stepIndex]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const currentStep = isActive ? WALKTHROUGH_STEPS[stepIndex] ?? null : null;

  return {
    isActive,
    stepIndex,
    currentStep,
    totalSteps: WALKTHROUGH_STEPS.length,
    canGoBack: stepIndex > 0,
    next,
    back,
    skip,
  };
}
