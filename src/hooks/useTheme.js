import { useCallback, useEffect, useState } from "react";
import { TOKENS } from "../styles/tokens.js";
import { THEMES } from "../styles/themes.js";
import { syncStandaloneRootClass } from "../utils/pwaInstall.js";

const STORAGE_KEY = "disc_theme";

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const vars = THEMES[theme];
  const root = document.documentElement;

  for (const [key, value] of Object.entries(TOKENS)) {
    root.style.setProperty(key, value);
  }
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  root.style.background = vars["--bg"];
  root.style.colorScheme = theme;
  document.body.style.background = vars["--bg"];
  document.body.style.margin = "0";
  document.body.style.color = vars["--text"];
  syncStandaloneRootClass();
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const initial = getStoredTheme();
    applyTheme(initial);
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable.
    }

    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    toggleTheme,
    cssVars: THEMES[theme],
  };
}
