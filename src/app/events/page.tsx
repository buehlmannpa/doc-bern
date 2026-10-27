import { getPublishedEvents } from "@/lib/db";
import { seedEvents } from "@/lib/seed";
import { toEventListItem } from "@/lib/blocks";
import type { EventListItem } from "@/lib/types";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events: EventListItem[] = seedEvents.map(toEventListItem);
  try {
    events = await getPublishedEvents();
  } catch {
    // Fallback auf Beispieldaten bei DB-Problemen
  }
  return <EventsClient events={events} />;
}
