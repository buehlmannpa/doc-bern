import { getPastYearSummary, getUpcomingEvents } from "@/lib/db";
import { seedEvents } from "@/lib/seed";
import { monthStartOf, zurichToday } from "@/lib/event-dates";
import { toEventListItem } from "@/lib/blocks";
import type { EventListItem } from "@/lib/types";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  // "Heute" wird auf dem Server in Schweizer Zeit bestimmt, damit Monatsgrenzen für alle gleich sind.
  const today = zurichToday();
  const monthStart = monthStartOf(today);
  let events: EventListItem[] = seedEvents.map(toEventListItem).filter((e) => (e.endDate && e.endDate > e.date ? e.endDate : e.date) >= monthStart);
  let pastYears: { year: number; count: number }[] = [];
  try {
    [events, pastYears] = await Promise.all([getUpcomingEvents(monthStart), getPastYearSummary(monthStart)]);
  } catch {
    // Fallback auf Beispieldaten bei DB-Problemen
  }
  return <EventsClient events={events} pastYears={pastYears} today={today} />;
}
