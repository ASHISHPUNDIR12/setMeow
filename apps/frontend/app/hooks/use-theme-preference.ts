"use client";

import { useEffect, useState } from "react";

export function useThemePreference() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("setmeow-theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("setmeow-theme", theme);
  }, [ready, theme]);

  return { theme, setTheme };
}
