"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

const navItems = [
  {
    href: "/",
    label: "Club",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
  },
  {
    href: "/newsletter",
    label: "News",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h10" />
    ),
  },
  {
    href: "/partners",
    label: "Vertragshändler",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    href: "/rabatte",
    label: "Vorteile",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    ),
  },
];

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "auto", label: "Auto" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { accentIndex, setAccentIndex, colors, themeMode, setThemeMode } = useTheme();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 z-40 glass-strong"
      style={{ borderRight: "1px solid var(--hairline)" }}
    >
      {/* Logo / Titel */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <Image src="/logo.png" alt="DOC Bern" width={40} height={40} className="rounded-xl" />
        <div className="min-w-0">
          <div className="font-bold text-sm tracking-tight leading-tight">DOC Bern</div>
          <div className="text-[11px] leading-tight" style={{ color: "var(--text-secondary)" }}>
            Ducati Official Club
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: "var(--text-secondary)" }}>
          Menü
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: active ? "rgba(var(--accent), 0.1)" : "transparent",
                  color: active ? "var(--accent-hex)" : "var(--text-primary)",
                }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                  {item.icon}
                </svg>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Einstellungen (unten) */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--hairline)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
          Einstellungen
        </p>

        {/* Theme */}
        <div className="p-1 rounded-xl flex gap-1 mb-3" style={{ background: "var(--field-bg)" }}>
          {themeOptions.map((opt) => {
            const active = themeMode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setThemeMode(opt.value)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: active ? "var(--accent-hex)" : "transparent",
                  color: active ? "var(--accent-foreground)" : "var(--text-secondary)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Akzentfarbe */}
        <div className="flex items-center justify-between">
          {colors.map((color, i) => (
            <button
              key={color.name}
              onClick={() => setAccentIndex(i)}
              aria-label={color.name}
              aria-pressed={accentIndex === i}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{
                background: color.hex,
                boxShadow: accentIndex === i ? `0 0 0 2px var(--bg-secondary), 0 0 0 4px ${color.hex}` : "none",
              }}
            >
              {accentIndex === i && (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={color.fg} strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
