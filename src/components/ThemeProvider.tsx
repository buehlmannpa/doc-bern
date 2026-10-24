"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Feste Akzentfarbe (Ducati Rot). Die frühere Farbauswahl wurde entfernt.
// WICHTIG: Muss mit dem Inline-Script in layout.tsx übereinstimmen.
const DEFAULT_ACCENT = { rgb: "227, 6, 19", hex: "#e30613", fg: "#ffffff" };

export type ThemeMode = "light" | "dark" | "auto";

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "auto",
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyTheme(mode: ThemeMode) {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = mode === "dark" || (mode === "auto" && prefersDark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  // Gespeicherten Theme-Modus laden
  useEffect(() => {
    const savedTheme = localStorage.getItem("doc-bern-theme") as ThemeMode | null;
    if (savedTheme) setThemeMode(savedTheme);
  }, []);

  // Feste Akzentfarbe anwenden (unabhängig von evtl. alten gespeicherten Werten)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", DEFAULT_ACCENT.rgb);
    root.style.setProperty("--accent-hex", DEFAULT_ACCENT.hex);
    root.style.setProperty("--accent-foreground", DEFAULT_ACCENT.fg);
  }, []);

  // Theme anwenden + auf Systemänderung reagieren (bei "auto")
  useEffect(() => {
    applyTheme(themeMode);
    localStorage.setItem("doc-bern-theme", themeMode);

    if (themeMode !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("auto");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
