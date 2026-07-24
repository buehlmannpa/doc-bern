"use client";

import { useEffect, useState } from "react";
import type { EventItem } from "@/lib/types";

type Platform = "apple" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isTouchMac =
    navigator.platform === "MacIntel" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isTouchMac) return "apple";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return "apple"; // Mac-Laptop → Apple Kalender/.ics
  return "desktop"; // Windows / Linux
}

// Baut Start/Ende als lokale (floating) Zeit im Format YYYYMMDDTHHMMSS
function toStamp(dateStr: string, timeStr: string, addHours = 0): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "09:00").split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, (hh || 0) + addHours, mm || 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`;
}

function buildICS(event: EventItem): string {
  const start = toStamp(event.date, event.time, 0);
  const end = toStamp(event.date, event.time, 2); // Standarddauer 2h
  const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const uid = `${event.id}@doc-bern`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DOC Bern//App//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc(event.title)}`,
    `DESCRIPTION:${esc(event.description)}`,
    `LOCATION:${esc(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function googleUrl(event: EventItem): string {
  const start = toStamp(event.date, event.time, 0);
  const end = toStamp(event.date, event.time, 2);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(event: EventItem) {
  const blob = new Blob([buildICS(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AddToCalendar({ event }: { event: EventItem }) {
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const icon = (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  // Primäraktion je nach Gerät
  function handlePrimary() {
    if (platform === "android") {
      window.open(googleUrl(event), "_blank");
    } else {
      // Apple (iPhone/Mac) + Windows/Linux: .ics öffnet den nativen Kalender
      downloadICS(event);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          onClick={handlePrimary}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl"
          style={{ background: "var(--accent-hex)", color: "var(--accent-foreground)" }}
        >
          {icon}
          Zum Kalender hinzufügen
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Weitere Kalender-Optionen"
          className="px-3 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(var(--accent), 0.1)", color: "var(--accent-hex)" }}
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => { downloadICS(event); setOpen(false); }}
            className="text-xs font-semibold py-2.5 rounded-xl"
            style={{ background: "var(--surface-subtle)", color: "var(--text-primary)" }}
          >
            Apple / Outlook (.ics)
          </button>
          <a
            href={googleUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="text-xs font-semibold py-2.5 rounded-xl text-center"
            style={{ background: "var(--surface-subtle)", color: "var(--text-primary)" }}
          >
            Google Kalender
          </a>
        </div>
      )}
    </div>
  );
}
