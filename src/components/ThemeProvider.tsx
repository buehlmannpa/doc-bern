"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AccentColor = {
  name: string;
  rgb: string;
  hex: string;
  fg: string; // lesbare Textfarbe auf dieser Akzentfarbe
};

// WICHTIG: Diese Liste muss mit dem Inline-Script in layout.tsx übereinstimmen.
export const accentColors: AccentColor[] = [
  { name: "Ducati Rot", rgb: "227, 6, 19", hex: "#e30613", fg: "#ffffff" },
  { name: "Racing Schwarz", rgb: "30, 30, 30", hex: "#1e1e1e", fg: "#ffffff" },
  { name: "Titanium", rgb: "120, 120, 128", hex: "#787880", fg: "#ffffff" },
  { name: "Gelb", rgb: "255, 204, 0", hex: "#ffcc00", fg: "#1d1d1f" },
  { name: "Blau", rgb: "0, 122, 255", hex: "#007aff", fg: "#ffffff" },
];

export type ThemeMode = "light" | "dark" | "auto";

type ThemeContextType = {
  accentIndex: number;
  setAccentIndex: (i: number) => void;
  colors: AccentColor[];
  themeMode: ThemeMode;
  setThemeMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  accentIndex: 0,
  setAccentIndex: () => {},
  colors: accentColors,
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
  const [accentIndex, setAccentIndex] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  // Gespeicherte Werte laden
  useEffect(() => {
    const savedAccent = localStorage.getItem("doc-bern-accent");
    if (savedAccent !== null) setAccentIndex(Number(savedAccent) || 0);
    const savedTheme = localStorage.getItem("doc-bern-theme") as ThemeMode | null;
    if (savedTheme) setThemeMode(savedTheme);
  }, []);

  // Akzentfarbe anwenden
  useEffect(() => {
    const c = accentColors[accentIndex] ?? accentColors[0];
    const root = document.documentElement;
    root.style.setProperty("--accent", c.rgb);
    root.style.setProperty("--accent-hex", c.hex);
    root.style.setProperty("--accent-foreground", c.fg);
    localStorage.setItem("doc-bern-accent", String(accentIndex));
  }, [accentIndex]);

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
    <ThemeContext.Provider
      value={{ accentIndex, setAccentIndex, colors: accentColors, themeMode, setThemeMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
