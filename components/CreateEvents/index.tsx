"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import ImageUploader from "@/components/image-uploader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";



export default function CreateEventPage() {
  const { toast } = useToast();
  const createEventMutation = useMutation(api.events.createEvent);
  const createEventQuestionMutation = useMutation(api.events.createEventQuestion);
  const [imageSelectedButNotUploaded, setImageSelectedButNotUploaded] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [host, setHost] = useState("");
  const [coverImageId, setCoverImageId] = useState<Id<"_storage"> | undefined>(undefined);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"text" | "number" | "email" | "scale">("text");
  const [questions, setQuestions] = useState<{ text: string; type: "text" | "number" | "email" | "scale" }[]>([]);
  const [openModal, setOpenModal] = useState(false);

  const [eventType, setEventType] = useState<"vip" | "general" | "vip_and_general">("general");
  const [vipAccessCode, setVipAccessCode] = useState("");
  const [vipLimit, setVipLimit] = useState<number | "">("");
  const [generalLimit, setGeneralLimit] = useState<number | "">("");
  const [ticketLimit, setTicketLimit] = useState<number | "">("");

  const handleCreateEvent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      const createdEventId = await createEventMutation({
        title,
        description,
        eventDate: new Date(eventDate).getTime(),
        location,
        host,
        coverImageId,
        eventType,
        vipAccessCode: vipAccessCode || undefined,
        ticketLimit: eventType === "vip_and_general" ? undefined : (ticketLimit === "" ? undefined : ticketLimit),
        vipTicketLimit: eventType === "vip_and_general" && vipLimit !== "" ? vipLimit : undefined,
        generalTicketLimit: eventType === "vip_and_general" && generalLimit !== "" ? generalLimit : undefined,
      });

      await Promise.all(
        questions.map((question) =>
          createEventQuestionMutation({
            eventId: createdEventId,
            questionText: question.text,
            questionType: question.type,
          })
        )
      );

      setTitle("");
      setDescription("");
      setEventDate("");
      setLocation("");
      setHost("");
      setCoverImageId(undefined);
      setQuestions([]);
      setQuestionText("");
      setQuestionType("text");
      setEventType("general");
      setVipAccessCode("");
      setTicketLimit("");
      setVipLimit("");
      setGeneralLimit("");

      toast({ title: "Success!", description: "Event created successfully!" });
    } catch (error) {
      console.error("Error creating event:", error);
      toast({ title: "Error!", description: "Failed to create event. Try again!", variant: "destructive" });
    }
  };

  const handleAddQuestion = () => {
    if (!questionText.trim()) return;
    setQuestions([...questions, { text: questionText, type: questionType }]);
    setQuestionText("");
    setQuestionType("text");
  };

  return (
    <div className="flex justify-center items-center min-h-screen px-4 sm:px-6">
      <div className="max-w-3xl w-full p-6 sm:p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">Create New Event</h1>

        <div className="mb-4">
        <ImageUploader
  setImageId={(storageId) => {
    setCoverImageId(storageId as Id<"_storage">);
  }}
  onFileSelect={() => setImageSelectedButNotUploaded(true)} // set your local flag
  onUploadConfirmed={() => setImageSelectedButNotUploaded(false)} // clear the flag on success
/>
        </div>

        <form
  onSubmit={(e) => {
    if (imageSelectedButNotUploaded && !coverImageId) {
      e.preventDefault();
      setOpenModal(true);
      return;
    }
    handleCreateEvent(e);
  }}
  className="space-y-5"
>
          <div>
            <Label>Event Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <Label>Event Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>

          <div>
            <Label>Event Date</Label>
            <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>

          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>

          <div>
            <Label>Host Name</Label>
            <Input value={host} onChange={(e) => setHost(e.target.value)} required />
          </div>

          <div>
            <Label>Event Type</Label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="border p-2 rounded-md w-full"
            >
              <option value="general">General</option>
              <option value="vip">VIP</option>
              <option value="vip_and_general">VIP + General</option>
            </select>
          </div>

          {eventType !== "general" && (
            <div>
              <Label>VIP Access Code</Label>
              <Input value={vipAccessCode} onChange={(e) => setVipAccessCode(e.target.value)} />
            </div>
          )}

          {eventType === "vip_and_general" ? (
            <>
              <div>
                <Label>VIP Ticket Limit</Label>
                <Input
                  type="number"
                  value={vipLimit}
                  onChange={(e) => setVipLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label>General Ticket Limit</Label>
                <Input
                  type="number"
                  value={generalLimit}
                  onChange={(e) => setGeneralLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  min={1}
                />
              </div>
            </>
          ) : (
            <div>
              <Label>Ticket Limit (optional)</Label>
              <Input
                type="number"
                value={ticketLimit}
                onChange={(e) => setTicketLimit(e.target.value === "" ? "" : Number(e.target.value))}
                min={1}
              />
            </div>
          )}

          {/* <div className="border-t pt-4">
            <h2 className="text-lg font-semibold text-gray-800">Add Questions</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3">
              <Input
                type="text"
                placeholder="Enter question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="flex-1"
              />
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as any)}
                className="border p-2 rounded-md"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="email">Email</option>
                <option value="scale">Scale</option>
              </select>
              <Button type="button" onClick={handleAddQuestion} className="mt-3 sm:mt-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </div>

            {questions.length > 0 && (
              <ul className="mt-4 space-y-2">
                {questions.map((q, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                    <span>{q.text} ({q.type})</span>
                  </li>
                ))}
              </ul>
            )}
          </div> */}

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" /> Create Event
          </Button>
        </form>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
  <DialogTrigger asChild></DialogTrigger>
  <DialogContent>
    <DialogTitle>Confirm Cover Image Upload</DialogTitle>
    <p>You selected a cover image but haven’t clicked “Confirm Upload.” Would you like to proceed anyway?</p>
    <DialogFooter className="mt-4 flex gap-2 justify-end">
      <Button variant="outline" onClick={() => setOpenModal(false)}>
        No, I Forgot
      </Button>
      <Button
        variant="destructive"
        onClick={() => {
          setOpenModal(false);
          handleCreateEvent(); // Proceed anyway
        }}
      >
        Yes, Continue
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      </div>

      <Toaster />
    </div>
  );
}
