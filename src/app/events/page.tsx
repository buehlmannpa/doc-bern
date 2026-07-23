import { getEvents } from "@/lib/db";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getEvents();
  return <EventsClient events={events} />;
}
