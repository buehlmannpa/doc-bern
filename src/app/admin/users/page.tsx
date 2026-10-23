"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

type AdminUser = { username: string; name: string; role: "superadmin" | "admin" };
type Draft = { username: string; name: string; role: "superadmin" | "admin"; password: string; isNew: boolean };

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-black/[0.04]";

export default function UsersAdminPage() {
  const [me, setMe] = useState<AdminUser | null | undefined>(undefined);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMe() {
    const res = await fetch("/api/admin/me");
    const data = await res.json();
    setMe(data.user ?? null);
  }
  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);
  useEffect(() => {
    if (me?.role === "superadmin") load();
  }, [me]);

  async function save() {
    if (!draft) return;
    if (!draft.username) { setError("Benutzername erforderlich."); return; }
    if (draft.isNew && !draft.password) { setError("Passwort erforderlich."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/admin/users", {
      method: draft.isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (res.ok) { setDraft(null); load(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || "Speichern fehlgeschlagen"); }
  }

  async function remove(username: string) {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return;
    const res = await fetch(`/api/admin/users?username=${encodeURIComponent(username)}`, { method: "DELETE" });
    if (res.ok) load();
    else { const d = await res.json().catch(() => ({})); alert(d.error || "Löschen fehlgeschlagen"); }
  }

  if (me === undefined) {
    return <div><AdminNav /><p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p></div>;
  }

  if (!me || me.role !== "superadmin") {
    return (
      <div>
        <AdminNav />
        <div className="glass-card p-6 text-center">
          <h1 className="text-lg font-bold mb-1">Kein Zugriff</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Die Benutzerverwaltung ist nur für Super-Admins (patrick, luca) verfügbar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Benutzer</h1>
        <button
          onClick={() => { setDraft({ username: "", name: "", role: "admin", password: "", isNew: true }); setError(""); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}
        >+ Neu</button>
      </div>
      <p className="text-xs mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
        Super-Admins können Admins anlegen, bearbeiten und löschen. Normale Admins sehen diese Seite nicht.
      </p>

      {loading ? <p className="text-sm px-1" style={{ color: "var(--text-secondary)" }}>Lädt…</p> : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.username} className="glass-card p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{u.name || u.username}</h3>
                  <span className="tag text-[10px]" style={{
                    background: u.role === "superadmin" ? "rgba(var(--accent), 0.12)" : "var(--field-bg)",
                    color: u.role === "superadmin" ? "var(--accent-text)" : "var(--text-secondary)",
                  }}>
                    {u.role === "superadmin" ? "Super-Admin" : "Admin"}
                  </span>
                  {u.username === me.username && (
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>(du)</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>@{u.username}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => { setDraft({ username: u.username, name: u.name, role: u.role, password: "", isNew: false }); setError(""); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-text)" }}>Bearbeiten</button>
                {u.username !== me.username && (
                  <button onClick={() => remove(u.username)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}>Löschen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDraft(null)}>
          <div className="glass-strong w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{draft.isNew ? "Neuer Benutzer" : `Benutzer bearbeiten`}</h2>
              <button onClick={() => setDraft(null)} className="text-sm" style={{ color: "var(--text-secondary)" }}>Schliessen</button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Benutzername *</span>
                <input value={draft.username} disabled={!draft.isNew} autoCapitalize="none"
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  className={inputCls} style={{ opacity: draft.isNew ? 1 : 0.6 }} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Anzeigename</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Rolle</span>
                <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Draft["role"] })} className={inputCls}>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super-Admin</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  {draft.isNew ? "Passwort *" : "Neues Passwort (leer = unverändert)"}
                </span>
                <input type="password" value={draft.password} autoComplete="new-password"
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })} className={inputCls} />
              </label>
            </div>
            {error && <p className="text-xs mt-3" style={{ color: "#ff3b30" }}>{error}</p>}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDraft(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--field-bg)" }}>Abbrechen</button>
              <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}>{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
