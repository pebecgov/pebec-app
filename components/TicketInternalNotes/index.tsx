"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit3, MessageSquare, Lock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";

interface TicketInternalNotesProps {
  ticketId: string;
}

export default function TicketInternalNotes({ ticketId }: TicketInternalNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const notes = useQuery(api.internal_notes.getTicketInternalNotes, { 
    ticketId: ticketId as Id<"tickets"> 
  });
  
  const addNote = useMutation(api.internal_notes.addInternalNote);
  const updateNote = useMutation(api.internal_notes.updateInternalNote);
  const deleteNote = useMutation(api.internal_notes.deleteInternalNote);

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

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    try {
      await updateNote({
        noteId: noteId as Id<"ticket_internal_notes">,
        content: editContent.trim()
      });
      setEditingNoteId(null);
      setEditContent("");
      toast.success("Note updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this internal note?")) {
      return;
    }

    try {
      await deleteNote({
        noteId: noteId as Id<"ticket_internal_notes">
      });
      toast.success("Note deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
    }
  };

  const startEdit = (note: any) => {
    setEditingNoteId(note._id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      case "mda":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (notes === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  // Don't show if user can't access internal notes
  if (notes === null) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Toaster />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-orange-500" />
            Internal Notes
            <Badge variant="outline" className="text-xs">
              MDA & Admin Only
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Private notes for communication between MDA and admin staff. Not visible to ticket creators.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Add new note */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add an internal note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px]"
            />
            <Button 
              onClick={handleAddNote}
              disabled={isAdding || !newNote.trim()}
              className="w-full sm:w-auto"
            >
              {isAdding ? "Adding..." : "Add Internal Note"}
            </Button>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No internal notes yet</p>
                <p className="text-sm">Add the first internal note to start MDA-Admin communication</p>
              </div>
            ) : (
              notes.map((note) => (
                <Card key={note._id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {note.authorName}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getRoleColor(note.authorRole)}`}
                        >
                          {note.authorRole.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(note)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note._id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {editingNoteId === note._id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditNote(note._id)}
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">
                        {note.content}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 