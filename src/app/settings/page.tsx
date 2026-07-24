"use client";

import { useTheme, type ThemeMode } from "@/components/ThemeProvider";

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
  { value: "auto", label: "Automatisch" },
];

export default function SettingsPage() {
  const { accentIndex, setAccentIndex, colors, themeMode, setThemeMode } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Einstellungen</h1>

      {/* Erscheinungsbild */}
      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-1">Erscheinungsbild</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Wähle Hell, Dunkel oder automatisch nach deinem Gerät.
        </p>
        <div className="p-1 rounded-2xl flex gap-1" style={{ background: "var(--field-bg)" }}>
          {themeOptions.map((opt) => {
            const active = themeMode === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setThemeMode(opt.value)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
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
      </section>

      {/* Akzentfarbe */}
      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-1">Akzentfarbe</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Passe die Farbe der App an deinen Stil an.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color, i) => (
            <button
              key={color.name}
              onClick={() => setAccentIndex(i)}
              className="flex flex-col items-center gap-1.5"
              aria-label={color.name}
              aria-pressed={accentIndex === i}
            >
              <span
                className="w-12 h-12 rounded-full transition-all flex items-center justify-center"
                style={{
                  background: color.hex,
                  boxShadow:
                    accentIndex === i
                      ? `0 0 0 3px var(--bg-secondary), 0 0 0 5px ${color.hex}`
                      : "none",
                }}
              >
                {accentIndex === i && (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={color.fg} strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-[10px] font-medium text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Über */}
      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-1">Über DOC Bern</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Ducati Official Club Bern – Die Community für Ducati-Enthusiasten in und um Bern.
        </p>
        <div className="mt-3 pt-3 text-xs border-t" style={{ color: "var(--text-secondary)", borderColor: "var(--hairline)" }}>
          <p>Version 1.0.0</p>
        </div>
      </section>
    </div>
  );
}
