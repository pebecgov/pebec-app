import React from "react";
import KanbanBoard from "@/components/KanbarBoard";

export default function KanbanPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Admin`s shared tasks</h1>
      <KanbanBoard />
    </div>
  );
}
