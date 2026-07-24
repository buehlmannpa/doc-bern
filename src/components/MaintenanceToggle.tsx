"use client";

import { useEffect, useState } from "react";

export default function MaintenanceToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setOn(Boolean(d.maintenance)))
      .catch(() => setOn(false));
  }, []);

  async function toggle() {
    if (on === null) return;
    const next = !on;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maintenance: next }),
    });
    setSaving(false);
    if (res.ok) {
      setOn(next);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Speichern fehlgeschlagen");
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-base mb-0.5">Wartungsmodus</h2>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {on
              ? "Aktiv – Besucher sehen nur das Logo und einen Hinweis."
              : "Inaktiv – die App ist normal erreichbar."}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving || on === null}
          aria-label="Wartungsmodus umschalten"
          className="relative w-14 h-8 rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
          style={{ background: on ? "var(--accent-hex)" : "rgba(0,0,0,0.15)" }}
        >
          <span
            className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform"
            style={{ transform: on ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
      </div>
      {on && (
        <p className="text-xs mt-3 p-2 rounded-lg" style={{ background: "rgba(255,149,0,0.1)", color: "#b26a00" }}>
          Der Wartungsmodus ist aktiv. Du als Admin kannst weiterhin auf /admin arbeiten.
        </p>
      )}
      {error && <p className="text-xs mt-2" style={{ color: "#ff3b30" }}>{error}</p>}
    </div>
  );
}
