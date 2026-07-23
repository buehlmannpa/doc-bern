"use client";

import type { EventLink } from "@/lib/types";

export default function LinksField({
  links,
  onChange,
}: {
  links: EventLink[];
  onChange: (links: EventLink[]) => void;
}) {
  function update(i: number, patch: Partial<EventLink>) {
    const next = links.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    onChange(next);
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...links, { label: "", url: "" }]);
  }

  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
            placeholder="Bezeichnung"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,0,0,0.04)" }}
          />
          <input
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            placeholder="https://…"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,0,0,0.04)" }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="w-8 h-8 rounded-full flex-shrink-0 text-sm"
            style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm font-semibold"
        style={{ color: "var(--accent-hex)" }}
      >
        + Link hinzufügen
      </button>
    </div>
  );
}
