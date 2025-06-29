"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface TicketInternalNotesProps {
  ticketId: string;
}

export default function TicketInternalNotes({ ticketId }: TicketInternalNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const notes = useQuery(api.internal_notes.getTicketInternalNotes, { 
    ticketId: ticketId as Id<"tickets"> 
  });
  
  const addNote = useMutation(api.internal_notes.addInternalNote);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      setIsAdding(true);
      await addNote({
        ticketId: ticketId as Id<"tickets">,
        content: newNote.trim()
      });
      setNewNote("");
      toast.success("Internal note added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add note");
    } finally {
      setIsAdding(false);
    }
  };

  if (notes === undefined) {
    return <div>Loading internal notes...</div>;
  }

  if (notes === null) {
    return null; // User doesn't have access
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">🔒 Internal Notes (MDA & Admin Only)</h3>
        
        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="Add an internal note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px]"
            />
            <Button 
              onClick={handleAddNote}
              disabled={isAdding || !newNote.trim()}
              className="mt-2"
            >
              {isAdding ? "Adding..." : "Add Internal Note"}
            </Button>
          </div>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No internal notes yet</p>
            ) : (
              notes.map((note) => (
                <Card key={note._id} className="p-3 border-l-4 border-l-orange-500">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <strong>{note.authorName}</strong>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                        {note.authorRole.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    {note.content}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 