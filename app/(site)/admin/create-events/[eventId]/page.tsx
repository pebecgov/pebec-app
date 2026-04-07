// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useParams } from "next/navigation";
import CreateEventPage from "@/components/CreateEvents";
import { Id } from "@/convex/_generated/dataModel";

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.eventId as string as Id<"events">;
  return (
    <div className="container mx-auto p-6">
      <CreateEventPage eventId={eventId} />
    </div>
  );
}