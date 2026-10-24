import type { ReactNode } from "react";

// Kachel-Layout für News/Events.
// Mobil: eine Spalte. Desktop: zwei UNABHÄNGIGE Spalten, die Kacheln werden
// abwechselnd links/rechts verteilt (Reihenfolge bleibt zeilenweise).
//
// Warum nicht CSS-Grid? Im Grid wird die ganze Zeile so hoch wie die
// aufgeklappte Kachel -> unter der Nachbarkachel entsteht eine Lücke.
// Mit eigenen Spalten wächst nur die aufgeklappte Kachel; die Kacheln der
// anderen Spalte bleiben exakt stehen. Im eingeklappten Zustand sind alle
// Kacheln gleich hoch (siehe TileImage + feste Textbereiche), die Reihen
// liegen dadurch sauber auf einer Linie.
export default function TileGrid({ items }: { items: ReactNode[] }) {
  const left = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div className="space-y-3 lg:hidden">{items}</div>
      <div className="hidden lg:flex lg:items-start lg:gap-4">
        <div className="flex-1 min-w-0 flex flex-col gap-4">{left}</div>
        <div className="flex-1 min-w-0 flex flex-col gap-4">{right}</div>
      </div>
    </>
  );
}
