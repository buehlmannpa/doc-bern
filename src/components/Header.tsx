"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header({ title }: { title?: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="DOC Bern"
            width={36}
            height={36}
            className="rounded-lg"
          />
          {!title && (
            <span className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
              DOC Bern
            </span>
          )}
        </Link>
        {title && (
          <h1 className="font-bold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>
            {title}
          </h1>
        )}
        <Link href="/settings" className="p-2 -mr-2 rounded-full" style={{ color: "var(--text-secondary)" }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
