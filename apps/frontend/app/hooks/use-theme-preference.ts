"use client";

import { useEffect, useState } from "react";

export function useThemePreference() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem("setmeow-theme");
        if (saved === "dark" || saved === "light") setTheme(saved);
      } catch {
        // Storage may be blocked; the in-memory preference still works.
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem("setmeow-theme", theme);
    } catch {
      // Keep the current theme even when the browser cannot persist it.
    }
  }, [ready, theme]);

  return { theme, setTheme };
}
