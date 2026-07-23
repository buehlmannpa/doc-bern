"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function SettingsPage() {
  const { accentIndex, setAccentIndex, colors } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight px-1">Einstellungen</h1>

      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-1">Akzentfarbe</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Passe die Farbe der App an deinen Stil an.
        </p>
        <div className="flex gap-3 flex-wrap">
          {colors.map((color, i) => (
            <button
              key={color.name}
              onClick={() => setAccentIndex(i)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="w-12 h-12 rounded-full transition-all flex items-center justify-center"
                style={{
                  background: color.hex,
                  boxShadow: accentIndex === i ? `0 0 0 3px white, 0 0 0 5px ${color.hex}` : "none",
                }}
              >
                {accentIndex === i && (
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card p-5">
        <h2 className="font-bold text-base mb-1">Über DOC Bern</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Ducati Official Club Bern – Die Community für Ducati-Enthusiasten in und um Bern.
        </p>
        <div className="mt-3 pt-3 border-t border-black/5 text-xs" style={{ color: "var(--text-secondary)" }}>
          <p>Version 1.0.0</p>
        </div>
      </section>

      <a
        href="/admin"
        className="glass-card p-4 flex items-center justify-between"
      >
        <span className="font-semibold text-sm">Admin-Bereich</span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Anmelden →</span>
      </a>
    </div>
  );
}
