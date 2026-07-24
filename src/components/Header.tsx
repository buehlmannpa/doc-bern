"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Header({ title }: { title?: string }) {
  const router = useRouter();
  const taps = useRef<{ count: number; last: number }>({ count: 0, last: 0 });

  function handleWordmarkTap() {
    const now = Date.now();
    // Zähler zurücksetzen, wenn zwischen zwei Taps mehr als 1.5s liegen
    taps.current.count = now - taps.current.last > 1500 ? 1 : taps.current.count + 1;
    taps.current.last = now;
    if (taps.current.count >= 5) {
      taps.current.count = 0;
      router.push("/admin");
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="Zur Startseite">
            <Image src="/logo.png" alt="DOC Bern" width={36} height={36} className="rounded-lg" />
          </Link>
          {!title && (
            <button
              type="button"
              onClick={handleWordmarkTap}
              className="font-bold text-base tracking-tight bg-transparent"
              style={{ color: "var(--text-primary)" }}
              aria-label="DOC Bern"
            >
              DOC Bern
            </button>
          )}
        </div>
        {title && (
          <h1 className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
        )}
        <Link
          href="/settings"
          aria-label="Einstellungen"
          className="p-2.5 -mr-2 rounded-full"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
