import { getEvents } from "@/lib/db";
import { seedEvents } from "@/lib/seed";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let events = seedEvents;
  try {
    events = await getEvents();
  } catch {
    // Fallback auf Beispieldaten bei DB-Problemen
  }
  return <EventsClient events={events} />;
}
