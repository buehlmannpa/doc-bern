"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Anmeldung fehlgeschlagen");
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="glass-card p-6 w-full max-w-sm">
        <Image src="/logo.png" alt="DOC Bern" width={64} height={64} className="mx-auto mb-4 rounded-2xl" />
        <h1 className="text-xl font-bold text-center mb-1">Admin-Bereich</h1>
        <p className="text-sm text-center mb-5" style={{ color: "var(--text-secondary)" }}>
          Bitte mit dem Admin-Passwort anmelden
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm mb-3 outline-none"
          style={{ background: "rgba(0,0,0,0.04)" }}
        />
        {error && (
          <p className="text-xs mb-3 text-center" style={{ color: "#ff3b30" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--accent-hex)" }}
        >
          {loading ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
