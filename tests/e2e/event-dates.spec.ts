import { test, expect } from "@playwright/test";
import { formatRange, groupByMonth, isOver, lastDay, monthStartOf, zurichToday } from "../../src/lib/event-dates";

// Reine Rechenlogik der Zeitstrahl-Daten (ohne Browser)

test.describe("Datums-Logik", () => {
  test("Heute wird in Schweizer Zeit bestimmt (Monatswechsel, Sommer-/Winterzeit)", () => {
    expect(zurichToday(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01"); // 00:30 in der Schweiz
    expect(zurichToday(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01"); // Sommerzeit: 00:30
    expect(zurichToday(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31"); // Winterzeit: 23:59
    expect(zurichToday(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
    expect(monthStartOf("2026-11-21")).toBe("2026-11-01");
  });

  test("Events werden automatisch Monaten zugeordnet, leere Monate entstehen nicht", () => {
    const events = [
      { date: "2027-03-14" },
      { date: "2026-11-25", time: "11:00" },
      { date: "2026-11-03", time: "10:00" },
      { date: "2027-01-10" },
    ];
    const g = groupByMonth(events, { floorMonth: "2026-11-01", direction: "asc" });
    expect(g.map((x) => x.key)).toEqual(["2026-11", "2027-01", "2027-03"]); // Dezember und Februar fehlen
    expect(g[0].events.map((e) => e.date)).toEqual(["2026-11-03", "2026-11-25"]); // im Monat nach Datum
    expect(g[1].label).toBe("Januar 2027");
  });

  test("Jahreswechsel, Schaltjahr und absteigende Reihenfolge", () => {
    const g = groupByMonth([{ date: "2024-02-29" }, { date: "2023-12-31" }, { date: "2024-01-01" }], { direction: "desc" });
    expect(g.map((x) => x.key)).toEqual(["2024-02", "2024-01", "2023-12"]);
    expect(g[0].label).toBe("Februar 2024");
  });

  test("Laufendes Event aus einem früheren Monat wird dem aktuellen Monat zugeordnet", () => {
    const g = groupByMonth([{ date: "2026-10-30", endDate: "2026-11-02" }], { floorMonth: "2026-11-01" });
    expect(g.map((x) => x.key)).toEqual(["2026-11"]);
  });

  test("Letzter Tag, vorbei und Datumsbereich", () => {
    expect(lastDay({ date: "2026-05-16" })).toBe("2026-05-16");
    expect(lastDay({ date: "2026-05-16", endDate: "2026-05-17" })).toBe("2026-05-17");
    expect(lastDay({ date: "2026-05-16", endDate: "2026-05-16" })).toBe("2026-05-16"); // gleicher Tag = eintägig
    expect(isOver({ date: "2026-05-16", endDate: "2026-05-18" }, "2026-05-17")).toBe(false); // läuft noch
    expect(isOver({ date: "2026-05-16" }, "2026-05-17")).toBe(true);
    expect(formatRange({ date: "2026-05-16" })).toMatch(/Sa.*16\. Mai 2026/);
    expect(formatRange({ date: "2026-05-16", endDate: "2026-05-17" })).toMatch(/Sa.*16\. – So.*17\. Mai 2026/);
    expect(formatRange({ date: "2026-10-30", endDate: "2026-11-02" })).toMatch(/30\. Okt.* – Mo.*2\. November 2026/);
  });
});
