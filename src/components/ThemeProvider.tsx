"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AccentColor = {
  name: string;
  rgb: string;
  hex: string;
};

const accentColors: AccentColor[] = [
  { name: "Ducati Rot", rgb: "227, 6, 19", hex: "#e30613" },
  { name: "Racing Schwarz", rgb: "30, 30, 30", hex: "#1e1e1e" },
  { name: "Titanium", rgb: "120, 120, 128", hex: "#787880" },
  { name: "Ocean", rgb: "0, 122, 255", hex: "#007aff" },
  { name: "Forest", rgb: "52, 199, 89", hex: "#34c759" },
];

type ThemeContextType = {
  accentIndex: number;
  setAccentIndex: (i: number) => void;
  colors: AccentColor[];
};

const ThemeContext = createContext<ThemeContextType>({
  accentIndex: 0,
  setAccentIndex: () => {},
  colors: accentColors,
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentIndex, setAccentIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("doc-bern-accent");
    if (saved) setAccentIndex(Number(saved));
  }, []);

  useEffect(() => {
    const color = accentColors[accentIndex];
    document.documentElement.style.setProperty("--accent", color.rgb);
    document.documentElement.style.setProperty("--accent-hex", color.hex);
    localStorage.setItem("doc-bern-accent", String(accentIndex));
  }, [accentIndex]);

  return (
    <ThemeContext.Provider value={{ accentIndex, setAccentIndex, colors: accentColors }}>
      {children}
    </ThemeContext.Provider>
  );
}
