"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const links = [
    { href: "/admin", label: "Übersicht" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/news", label: "News" },
    { href: "/admin/actions", label: "Rabattaktion" },
    { href: "/admin/partners", label: "Partner" },
    { href: "/admin/board", label: "Vorstand" },
  ];

  return (
    <div className="glass-card p-2 flex items-center gap-1 mb-5 flex-wrap">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: active ? "var(--accent-hex)" : "transparent",
              color: active ? "var(--accent-foreground)" : "var(--text-secondary)",
            }}
          >
            {l.label}
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="ml-auto px-3 py-1.5 rounded-xl text-sm font-semibold"
        style={{ color: "#ff3b30" }}
      >
        Abmelden
      </button>
    </div>
  );
}
